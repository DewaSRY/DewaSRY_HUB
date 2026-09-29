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
import com.sdewa.coreservices.content.ContentDtos.TranslationInput;
import com.sdewa.coreservices.content.body.ArticleBodyValidator;
import com.sdewa.coreservices.media.Image;
import com.sdewa.coreservices.media.ImageRepository;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
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

    public static final Map<String, String> SORT = Map.of("updatedAt", "updatedAt", "publishedAt", "publishedAt", "title", "sortTitle");

    private final ArticleRepository articles;
    private final ArticleSlugHistoryRepository slugHistory;
    private final CategoryRepository categories;
    private final TagRepository tags;
    private final ImageRepository images;
    private final ArticleBodyValidator bodyValidator;
    private final ContentViews views;
    private final ContentLocales locales;
    private final JsonText json;
    private final Clock clock;

    public ArticleAdminService(ArticleRepository articles, ArticleSlugHistoryRepository slugHistory, CategoryRepository categories,
                               TagRepository tags, ImageRepository images, ArticleBodyValidator bodyValidator,
                               ContentViews views, ContentLocales locales, JsonText json, Clock clock) {
        this.articles = articles;
        this.slugHistory = slugHistory;
        this.categories = categories;
        this.tags = tags;
        this.images = images;
        this.bodyValidator = bodyValidator;
        this.views = views;
        this.locales = locales;
        this.json = json;
        this.clock = clock;
    }

    public record ListResult(List<AdminArticleSummary> items, long total) {
    }

    @Transactional(readOnly = true)
    public ListResult list(String q, ArticleStatus status, UUID categoryId, UUID tagId, String locale, String missingLocale,
                           PageQuery page) {
        String has = locale == null || locale.isBlank() ? null : locales.resolve(locale, "locale");
        String missing = missingLocale == null || missingLocale.isBlank() ? null : locales.resolve(missingLocale, "missingLocale");
        Specification<Article> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                // A match in any language.
                Subquery<UUID> sq = query.subquery(UUID.class);
                Root<ArticleTranslation> t = sq.from(ArticleTranslation.class);
                sq.select(t.get("id")).where(cb.equal(t.get("article"), root),
                        cb.like(cb.lower(t.get("title")), Texts.likeContains(q.trim()), '\\'));
                ps.add(cb.exists(sq));
            }
            if (has != null) {
                ps.add(cb.exists(translationIn(root, query, cb, has)));
            }
            if (missing != null) {
                ps.add(cb.not(cb.exists(translationIn(root, query, cb, missing))));
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

    private static Subquery<UUID> translationIn(Root<Article> root, CriteriaQuery<?> query, CriteriaBuilder cb, String locale) {
        Subquery<UUID> sq = query.subquery(UUID.class);
        Root<ArticleTranslation> t = sq.from(ArticleTranslation.class);
        return sq.select(t.get("id")).where(cb.equal(t.get("article"), root), cb.equal(t.get("locale"), locale));
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
            slug = uniqueSlugFrom(slugSourceTitle(input));
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
        // Translations are child rows; touching the article makes every save bump its version.
        article.setUpdatedAt(clock.instant());
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
        if (Texts.isBlank(article.getSlug())) {
            missing.add(new FieldErrorItem("slug", "Is required to publish."));
        }
        if (article.getTranslations().isEmpty()) {
            missing.add(new FieldErrorItem("translations", "At least one language is required to publish."));
        }
        // Every language that exists goes live, so every one must be complete.
        for (String locale : views.localesOf(article)) {
            ArticleTranslation t = article.getTranslations().get(locale);
            if (Texts.isBlank(t.getTitle())) {
                missing.add(new FieldErrorItem("translations." + locale + ".title", "Is required to publish."));
            }
            if (Texts.isBlank(t.getExcerpt())) {
                missing.add(new FieldErrorItem("translations." + locale + ".excerpt", "Is required to publish."));
            }
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

    /** A validated translation, ready to be written. */
    private record PreparedTranslation(String locale, TranslationInput input, ArticleBodyValidator.Result body) {
    }

    private void apply(Article article, ArticleInput input, boolean creating) {
        List<FieldErrorItem> errors = new ArrayList<>();
        List<PreparedTranslation> prepared = prepareTranslations(input, creating, errors);

        Set<UUID> bodyImageIds = new LinkedHashSet<>();
        prepared.forEach(p -> bodyImageIds.addAll(p.body().imageIds()));
        Set<Image> bodyImages = new LinkedHashSet<>();
        if (!bodyImageIds.isEmpty()) {
            List<Image> found = images.findAllById(bodyImageIds);
            Set<UUID> foundIds = new HashSet<>();
            found.forEach(i -> foundIds.add(i.getId()));
            for (PreparedTranslation p : prepared) {
                for (UUID imageId : p.body().imageIds()) {
                    if (!foundIds.contains(imageId)) {
                        errors.add(new FieldErrorItem("translations." + p.locale() + ".body",
                                "Image " + imageId + " does not exist in the media library."));
                    }
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
            for (PreparedTranslation p : prepared) {
                if (Texts.isBlank(p.input().excerpt())) {
                    errors.add(new FieldErrorItem("translations." + p.locale() + ".excerpt", "Is required while the article is published."));
                }
            }
            if (input.categoryId() == null) {
                errors.add(new FieldErrorItem("categoryId", "Is required while the article is published."));
            }
        }
        if (!errors.isEmpty()) {
            throw new ApiException(ErrorReason.VALIDATION_FAILED, errors);
        }

        Set<String> keep = new HashSet<>();
        prepared.forEach(p -> keep.add(p.locale()));
        for (String locale : List.copyOf(article.getTranslations().keySet())) {
            if (!keep.contains(locale)) {
                article.getTranslations().remove(locale);
            }
        }
        for (PreparedTranslation p : prepared) {
            ArticleTranslation t = article.translation(p.locale());
            t.setTitle(p.input().title().trim());
            t.setExcerpt(Texts.trimToNull(p.input().excerpt()));
            t.setMetaTitle(Texts.trimToNull(p.input().metaTitle()));
            t.setMetaDescription(Texts.trimToNull(p.input().metaDescription()));
            t.setBody(json.write(p.body().doc()));
            t.setBodySchemaVersion((short) ArticleBodyValidator.SCHEMA_VERSION);
            t.setBodyText(p.body().bodyText());
            t.setWordCount(p.body().wordCount());
        }
        article.setCoverImage(cover);
        article.setCategory(category);
        article.getTags().clear();
        article.getTags().addAll(tagSet);
        article.getBodyImages().clear();
        article.getBodyImages().addAll(bodyImages);
    }

    /**
     * Checks every language of the input. Field errors are named {@code translations.<locale>.<field>}
     * (body paths become {@code translations.<locale>.body.content[3]…}).
     */
    private List<PreparedTranslation> prepareTranslations(ArticleInput input, boolean creating, List<FieldErrorItem> errors) {
        Map<String, TranslationInput> inputs = input.translations() == null ? Map.of() : input.translations();
        if (inputs.isEmpty()) {
            errors.add(new FieldErrorItem("translations", "At least one language is required."));
        }
        List<PreparedTranslation> prepared = new ArrayList<>();
        for (Map.Entry<String, TranslationInput> entry : inputs.entrySet()) {
            String locale = entry.getKey();
            TranslationInput t = entry.getValue();
            String path = "translations." + locale;
            if (!locales.isSupported(locale)) {
                errors.add(new FieldErrorItem(path, "Unsupported language. Use one of " + String.join(", ", locales.supported()) + "."));
                continue;
            }
            if (t == null) {
                errors.add(new FieldErrorItem(path, "Is required."));
                continue;
            }
            if (Texts.isBlank(t.title())) {
                errors.add(new FieldErrorItem(path + ".title", "Is required."));
            } else if (t.title().trim().length() > 200) {
                errors.add(new FieldErrorItem(path + ".title", "Must be at most 200 characters."));
            }
            maxLength(errors, path + ".excerpt", t.excerpt(), 500);
            maxLength(errors, path + ".metaTitle", t.metaTitle(), 200);
            maxLength(errors, path + ".metaDescription", t.metaDescription(), 320);
            if (t.bodySchemaVersion() != null && t.bodySchemaVersion() != ArticleBodyValidator.SCHEMA_VERSION) {
                errors.add(new FieldErrorItem(path + ".bodySchemaVersion", "Only version " + ArticleBodyValidator.SCHEMA_VERSION + " is supported."));
            }
            try {
                ArticleBodyValidator.Result body = bodyValidator.validate(t.body() == null && creating ? ArticleBodyValidator.emptyDoc() : t.body());
                prepared.add(new PreparedTranslation(locale, t, body));
            } catch (ApiException e) {
                if (e.reason() != ErrorReason.VALIDATION_FAILED) {
                    throw e;
                }
                e.errors().forEach(item -> errors.add(new FieldErrorItem(path + "." + item.field(), item.message())));
            }
        }
        return prepared;
    }

    private static void maxLength(List<FieldErrorItem> errors, String field, String value, int max) {
        if (value != null && value.trim().length() > max) {
            errors.add(new FieldErrorItem(field, "Must be at most " + max + " characters."));
        }
    }

    /** The title a new slug is made from: the fallback language, else the first one given. */
    private String slugSourceTitle(ArticleInput input) {
        if (input.translations() == null || input.translations().isEmpty()) {
            return "";
        }
        String locale = locales.pick(input.translations().keySet(), null);
        TranslationInput t = input.translations().get(locale);
        return t == null || t.title() == null ? "" : t.title();
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
