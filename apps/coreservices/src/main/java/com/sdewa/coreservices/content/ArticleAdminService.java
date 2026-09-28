package com.sdewa.coreservices.content;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.error.FieldErrorItem;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.common.util.JsonText;
import com.sdewa.coreservices.common.util.Slugs;
import com.sdewa.coreservices.common.util.Texts;
import com.sdewa.coreservices.content.ContentDtos.AdminArticle;
import com.sdewa.coreservices.content.ContentDtos.AdminArticleSummary;
import com.sdewa.coreservices.content.ContentDtos.ArticleInput;
import com.sdewa.coreservices.content.ContentDtos.Mutation;
import com.sdewa.coreservices.content.body.ArticleBodyValidator;
import com.sdewa.coreservices.media.Image;
import com.sdewa.coreservices.media.ImageRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Admin article management (UC-16, UC-17, UC-18). Revalidation is sent by the caller after commit. */
@Service
@Transactional
public class ArticleAdminService {

    public static final Map<String, String> SORT = Map.of("updatedAt", "updatedAt", "publishedAt", "publishedAt", "title", "title");

    private final ArticleRepository articles;
    private final ArticleSlugHistoryRepository slugHistory;
    private final CategoryRepository categories;
    private final TagRepository tags;
    private final ImageRepository images;
    private final ArticleBodyValidator bodyValidator;
    private final ContentViews views;
    private final JsonText json;
    private final Clock clock;

    public ArticleAdminService(ArticleRepository articles, ArticleSlugHistoryRepository slugHistory, CategoryRepository categories,
                               TagRepository tags, ImageRepository images, ArticleBodyValidator bodyValidator,
                               ContentViews views, JsonText json, Clock clock) {
        this.articles = articles;
        this.slugHistory = slugHistory;
        this.categories = categories;
        this.tags = tags;
        this.images = images;
        this.bodyValidator = bodyValidator;
        this.views = views;
        this.json = json;
        this.clock = clock;
    }

    public record ListResult(List<AdminArticleSummary> items, long total) {
    }

    @Transactional(readOnly = true)
    public ListResult list(String q, ArticleStatus status, UUID categoryId, UUID tagId, PageQuery page) {
        Specification<Article> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                ps.add(cb.like(cb.lower(root.get("title")), Texts.likeContains(q.trim()), '\\'));
            }
            if (status != null) {
                ps.add(cb.equal(root.get("status"), status));
            }
            if (categoryId != null) {
                ps.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (tagId != null) {
                Join<Article, Tag> t = root.join("tags", JoinType.INNER);
                ps.add(cb.equal(t.get("id"), tagId));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
        Page<Article> result = articles.findAll(spec, page.pageableWithTieBreak());
        return new ListResult(result.getContent().stream().map(views::adminSummary).toList(), result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public AdminArticle get(UUID id) {
        return toAdmin(find(id));
    }

    public AdminArticle create(ArticleInput input) {
        Article article = new Article();
        String slug;
        if (input.slug() != null && !input.slug().isBlank()) {
            slug = input.slug().trim();
            requireValidSlug(slug);
            if (slugTaken(slug, null)) {
                throw new ApiException(ErrorReason.SLUG_TAKEN);
            }
        } else {
            slug = uniqueSlugFrom(input.title());
        }
        article.setSlug(slug);
        apply(article, input, true);
        articles.saveAndFlush(article);
        return toAdmin(article);
    }

    public Mutation<AdminArticle> update(UUID id, ArticleInput input) {
        Article article = find(id);
        if (input.version() == null) {
            throw ApiException.validation("version", "Is required.");
        }
        if (input.version() != article.getVersion()) {
            throw new ApiException(ErrorReason.VERSION_CONFLICT);
        }
        if (input.body() == null) {
            throw ApiException.validation("body", "Is required.");
        }
        String oldSlug = article.getSlug();
        Set<String> before = new LinkedHashSet<>(article.isPublished() ? RevalidationPaths.forArticle(article, List.of()) : List.of());
        String newSlug = input.slug() == null || input.slug().isBlank() ? oldSlug : input.slug().trim();
        if (!newSlug.equals(oldSlug)) {
            requireValidSlug(newSlug);
            if (slugTaken(newSlug, article.getId())) {
                throw new ApiException(ErrorReason.SLUG_TAKEN);
            }
            // Taking back one of its own old slugs removes that redirect.
            slugHistory.findById(newSlug).filter(h -> h.getArticleId().equals(article.getId())).ifPresent(slugHistory::delete);
            if (article.isPublished()) {
                slugHistory.save(new ArticleSlugHistory(oldSlug, article.getId()));
            }
            article.setSlug(newSlug);
        }
        apply(article, input, false);
        articles.flush();
        List<String> paths = new ArrayList<>();
        if (article.isPublished()) {
            paths.addAll(before);
            paths.addAll(RevalidationPaths.forArticle(article, newSlug.equals(oldSlug) ? List.of() : List.of(oldSlug)));
        }
        return new Mutation<>(toAdmin(article), paths);
    }

    public Mutation<Void> delete(UUID id) {
        Article article = find(id);
        List<String> paths = new ArrayList<>();
        if (article.isPublished()) {
            paths.addAll(RevalidationPaths.forArticle(article, previousSlugs(article.getId())));
        }
        articles.delete(article);
        articles.flush();
        return new Mutation<>(null, paths);
    }

    public Mutation<AdminArticle> publish(UUID id) {
        Article article = find(id);
        if (article.isPublished()) {
            return new Mutation<>(toAdmin(article), List.of());
        }
        List<FieldErrorItem> missing = new ArrayList<>();
        if (Texts.isBlank(article.getTitle())) {
            missing.add(new FieldErrorItem("title", "Is required to publish."));
        }
        if (Texts.isBlank(article.getSlug())) {
            missing.add(new FieldErrorItem("slug", "Is required to publish."));
        }
        if (Texts.isBlank(article.getExcerpt())) {
            missing.add(new FieldErrorItem("excerpt", "Is required to publish."));
        }
        if (article.getCategory() == null) {
            missing.add(new FieldErrorItem("categoryId", "Is required to publish."));
        }
        if (!missing.isEmpty()) {
            throw new ApiException(ErrorReason.ARTICLE_INCOMPLETE, missing);
        }
        article.setStatus(ArticleStatus.PUBLISHED);
        if (article.getPublishedAt() == null) {
            article.setPublishedAt(clock.instant());
        }
        articles.flush();
        return new Mutation<>(toAdmin(article), RevalidationPaths.forArticle(article, List.of()));
    }

    public Mutation<AdminArticle> unpublish(UUID id) {
        Article article = find(id);
        if (!article.isPublished()) {
            return new Mutation<>(toAdmin(article), List.of());
        }
        article.setStatus(ArticleStatus.DRAFT);
        articles.flush();
        return new Mutation<>(toAdmin(article), RevalidationPaths.forArticle(article, previousSlugs(article.getId())));
    }

    private void apply(Article article, ArticleInput input, boolean creating) {
        List<FieldErrorItem> errors = new ArrayList<>();
        article.setTitle(input.title().trim());
        article.setExcerpt(Texts.trimToNull(input.excerpt()));
        article.setMetaTitle(Texts.trimToNull(input.metaTitle()));
        article.setMetaDescription(Texts.trimToNull(input.metaDescription()));

        if (input.bodySchemaVersion() != null && input.bodySchemaVersion() != ArticleBodyValidator.SCHEMA_VERSION) {
            errors.add(new FieldErrorItem("bodySchemaVersion", "Only version " + ArticleBodyValidator.SCHEMA_VERSION + " is supported."));
        }
        ArticleBodyValidator.Result body = bodyValidator.validate(input.body() == null && creating
                ? ArticleBodyValidator.emptyDoc() : input.body());

        Set<Image> bodyImages = new LinkedHashSet<>();
        if (!body.imageIds().isEmpty()) {
            List<Image> found = images.findAllById(body.imageIds());
            Set<UUID> foundIds = new HashSet<>();
            found.forEach(i -> foundIds.add(i.getId()));
            for (UUID imageId : body.imageIds()) {
                if (!foundIds.contains(imageId)) {
                    errors.add(new FieldErrorItem("body", "Image " + imageId + " does not exist in the media library."));
                }
            }
            bodyImages.addAll(found);
        }
        Image cover = null;
        if (input.coverImageId() != null) {
            cover = images.findById(input.coverImageId()).orElse(null);
            if (cover == null) {
                errors.add(new FieldErrorItem("coverImageId", "Image does not exist."));
            }
        }
        Category category = null;
        if (input.categoryId() != null) {
            category = categories.findById(input.categoryId()).orElse(null);
            if (category == null) {
                errors.add(new FieldErrorItem("categoryId", "Category does not exist."));
            }
        }
        Set<Tag> tagSet = new LinkedHashSet<>();
        if (input.tagIds() != null && !input.tagIds().isEmpty()) {
            Set<UUID> ids = new LinkedHashSet<>(input.tagIds());
            if (ids.size() > 30) {
                errors.add(new FieldErrorItem("tagIds", "At most 30 tags."));
            }
            List<Tag> found = tags.findAllById(ids);
            if (found.size() != ids.size()) {
                errors.add(new FieldErrorItem("tagIds", "One or more tags do not exist."));
            }
            tagSet.addAll(found);
        }
        if (article.isPublished()) {
            // A published article must stay complete (ADR-004 articles_publish_complete).
            if (Texts.isBlank(article.getExcerpt())) {
                errors.add(new FieldErrorItem("excerpt", "Is required while the article is published."));
            }
            if (input.categoryId() == null) {
                errors.add(new FieldErrorItem("categoryId", "Is required while the article is published."));
            }
        }
        if (!errors.isEmpty()) {
            throw new ApiException(ErrorReason.VALIDATION_FAILED, errors);
        }
        article.setBody(json.write(body.doc()));
        article.setBodySchemaVersion((short) ArticleBodyValidator.SCHEMA_VERSION);
        article.setBodyText(body.bodyText());
        article.setWordCount(body.wordCount());
        article.setCoverImage(cover);
        article.setCategory(category);
        article.getTags().clear();
        article.getTags().addAll(tagSet);
        article.getBodyImages().clear();
        article.getBodyImages().addAll(bodyImages);
    }

    private boolean slugTaken(String slug, UUID excludeArticleId) {
        return articles.slugTaken(slug, excludeArticleId) || slugHistory.slugTaken(slug, excludeArticleId);
    }

    private String uniqueSlugFrom(String title) {
        String base = Slugs.slugify(title);
        if (base.isEmpty()) {
            base = "article";
        }
        String candidate = base;
        int n = 2;
        while (slugTaken(candidate, null)) {
            candidate = Slugs.withSuffix(base, n++);
        }
        return candidate;
    }

    private static void requireValidSlug(String slug) {
        if (!Slugs.isValid(slug)) {
            throw ApiException.validation("slug", "Must be lowercase a-z, 0-9 and '-', at most 120 characters.");
        }
    }

    private Article find(UUID id) {
        return articles.findById(id).orElseThrow(ApiException::notFound);
    }

    private List<String> previousSlugs(UUID articleId) {
        return slugHistory.findAllByArticleIdOrderByCreatedAtAsc(articleId).stream().map(ArticleSlugHistory::getOldSlug).toList();
    }

    private AdminArticle toAdmin(Article article) {
        return views.admin(article, previousSlugs(article.getId()));
    }
}
