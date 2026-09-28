package com.sdewa.coreservices.content;

import com.sdewa.coreservices.common.api.PatchBody;
import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.util.Slugs;
import com.sdewa.coreservices.common.util.Texts;
import com.sdewa.coreservices.content.ContentDtos.AdminTerm;
import com.sdewa.coreservices.content.ContentDtos.Mutation;
import com.sdewa.coreservices.content.ContentDtos.TermInput;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Categories and tags (UC-20, ADR-003 §10.5–10.6). */
@Service
@Transactional
public class TaxonomyAdminService {

    public enum Kind { CATEGORY, TAG }

    private final CategoryRepository categories;
    private final TagRepository tags;
    private final ArticleRepository articles;

    public TaxonomyAdminService(CategoryRepository categories, TagRepository tags, ArticleRepository articles) {
        this.categories = categories;
        this.tags = tags;
        this.articles = articles;
    }

    @Transactional(readOnly = true)
    public List<AdminTerm> list(Kind kind) {
        Map<UUID, long[]> counts = new HashMap<>();
        for (Object[] row : kind == Kind.CATEGORY ? articles.countsByCategory() : articles.countsByTag()) {
            counts.put((UUID) row[0], new long[]{((Number) row[1]).longValue(), row[2] == null ? 0 : ((Number) row[2]).longValue()});
        }
        List<? extends TaxonomyTerm> terms = kind == Kind.CATEGORY ? categories.findAllByOrderByNameAsc() : tags.findAllByOrderByNameAsc();
        return terms.stream().map(t -> {
            long[] c = counts.getOrDefault(t.getId(), new long[]{0, 0});
            return new AdminTerm(t.getId(), t.getName(), t.getSlug(), c[0], c[1], null);
        }).toList();
    }

    public AdminTerm create(Kind kind, TermInput input) {
        String name = input.name().trim();
        String slug = Texts.isBlank(input.slug()) ? Slugs.slugify(name) : input.slug().trim();
        if (!Slugs.isValid(slug)) {
            throw ApiException.validation("slug", "Must be lowercase a-z, 0-9 and '-', at most 120 characters.");
        }
        if (nameTaken(kind, name, null)) {
            throw new ApiException(ErrorReason.NAME_TAKEN);
        }
        if (slugTaken(kind, slug, null)) {
            throw new ApiException(ErrorReason.SLUG_TAKEN);
        }
        TaxonomyTerm term = kind == Kind.CATEGORY ? new Category() : new Tag();
        term.setName(name);
        term.setSlug(slug);
        if (term instanceof Category c) {
            categories.saveAndFlush(c);
        } else {
            tags.saveAndFlush((Tag) term);
        }
        return new AdminTerm(term.getId(), term.getName(), term.getSlug(), 0, 0, null);
    }

    public Mutation<AdminTerm> patch(Kind kind, UUID id, JsonNode body) {
        TaxonomyTerm term = find(kind, id);
        PatchBody patch = PatchBody.of(body, Set.of("name", "slug"));
        String oldSlug = term.getSlug();
        String oldName = term.getName();
        if (patch.has("name")) {
            String name = Texts.trimToNull(patch.string("name"));
            if (name == null || name.length() > 80) {
                patch.error("name", "Must be between 1 and 80 characters.");
            } else {
                term.setName(name);
            }
        }
        if (patch.has("slug")) {
            String slug = Texts.trimToNull(patch.string("slug"));
            if (!Slugs.isValid(slug)) {
                patch.error("slug", "Must be lowercase a-z, 0-9 and '-', at most 120 characters.");
            } else {
                term.setSlug(slug);
            }
        }
        patch.throwIfInvalid();
        if (!term.getName().equals(oldName) && nameTaken(kind, term.getName(), id)) {
            throw new ApiException(ErrorReason.NAME_TAKEN);
        }
        if (!term.getSlug().equals(oldSlug) && slugTaken(kind, term.getSlug(), id)) {
            throw new ApiException(ErrorReason.SLUG_TAKEN);
        }
        flush(kind);
        List<String> paths = new ArrayList<>();
        boolean changed = !term.getName().equals(oldName) || !term.getSlug().equals(oldSlug);
        List<Article> published = kind == Kind.CATEGORY ? articles.findPublishedByCategory(id) : articles.findPublishedByTag(id);
        if (changed && !published.isEmpty()) {
            paths.add(termPath(kind, oldSlug));
            paths.add(termPath(kind, term.getSlug()));
            paths.add(RevalidationPaths.BLOG);
            published.forEach(a -> paths.add(RevalidationPaths.article(a.getSlug())));
            paths.add(RevalidationPaths.SITEMAP);
        }
        AdminTerm view = list(kind).stream().filter(t -> t.id().equals(id)).findFirst().orElseThrow();
        return new Mutation<>(view, paths);
    }

    public Mutation<Void> delete(Kind kind, UUID id) {
        TaxonomyTerm term = find(kind, id);
        List<String> paths = new ArrayList<>();
        if (kind == Kind.CATEGORY) {
            long count = articles.countByCategoryId(id);
            if (count > 0) {
                throw new ApiException(ErrorReason.CATEGORY_IN_USE,
                        "The category still has " + count + " article(s); move them to another category first");
            }
            categories.delete((Category) term);
            categories.flush();
        } else {
            List<Article> published = articles.findPublishedByTag(id);
            if (!published.isEmpty()) {
                paths.add(termPath(kind, term.getSlug()));
                paths.add(RevalidationPaths.BLOG);
                published.forEach(a -> paths.add(RevalidationPaths.article(a.getSlug())));
                paths.add(RevalidationPaths.SITEMAP);
            }
            // article_tags rows go with ON DELETE CASCADE (UC-20).
            tags.delete((Tag) term);
            tags.flush();
        }
        return new Mutation<>(null, paths);
    }

    private TaxonomyTerm find(Kind kind, UUID id) {
        return (kind == Kind.CATEGORY ? categories.findById(id).map(TaxonomyTerm.class::cast) : tags.findById(id).map(TaxonomyTerm.class::cast))
                .orElseThrow(ApiException::notFound);
    }

    private boolean nameTaken(Kind kind, String name, UUID exclude) {
        return kind == Kind.CATEGORY ? categories.nameTaken(name, exclude) : tags.nameTaken(name, exclude);
    }

    private boolean slugTaken(Kind kind, String slug, UUID exclude) {
        return kind == Kind.CATEGORY ? categories.slugTaken(slug, exclude) : tags.slugTaken(slug, exclude);
    }

    private void flush(Kind kind) {
        if (kind == Kind.CATEGORY) {
            categories.flush();
        } else {
            tags.flush();
        }
    }

    private static String termPath(Kind kind, String slug) {
        return kind == Kind.CATEGORY ? RevalidationPaths.category(slug) : RevalidationPaths.tag(slug);
    }
}
