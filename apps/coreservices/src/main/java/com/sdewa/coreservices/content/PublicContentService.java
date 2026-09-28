package com.sdewa.coreservices.content;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.content.ContentDtos.ArticleSummary;
import com.sdewa.coreservices.content.ContentDtos.PublicArticle;
import com.sdewa.coreservices.content.ContentDtos.PublicTerm;
import com.sdewa.coreservices.content.ContentDtos.Sitemap;
import com.sdewa.coreservices.content.ContentDtos.SitemapEntry;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Group 1 content reads (UC-01, UC-03). Only published data. */
@Service
@Transactional(readOnly = true)
public class PublicContentService {

    private final ArticleRepository articles;
    private final ArticleSlugHistoryRepository slugHistory;
    private final CategoryRepository categories;
    private final TagRepository tags;
    private final ContentViews views;

    public PublicContentService(ArticleRepository articles, ArticleSlugHistoryRepository slugHistory,
                                CategoryRepository categories, TagRepository tags, ContentViews views) {
        this.articles = articles;
        this.slugHistory = slugHistory;
        this.categories = categories;
        this.tags = tags;
        this.views = views;
    }

    public record ListResult(List<ArticleSummary> items, long total) {
    }

    public ListResult list(String categorySlug, String tagSlug, PageQuery page) {
        Specification<Article> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            ps.add(cb.equal(root.get("status"), ArticleStatus.PUBLISHED));
            if (categorySlug != null && !categorySlug.isBlank()) {
                ps.add(cb.equal(root.join("category", JoinType.INNER).get("slug"), categorySlug));
            }
            if (tagSlug != null && !tagSlug.isBlank()) {
                Join<Article, Tag> t = root.join("tags", JoinType.INNER);
                ps.add(cb.equal(t.get("slug"), tagSlug));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
        Page<Article> result = articles.findAll(spec, page.pageableWithTieBreak());
        return new ListResult(result.getContent().stream().map(views::summary).toList(), result.getTotalElements());
    }

    /** Either the article, or the new slug when {@code slug} is an old slug of a published article (301). */
    public record ArticleLookup(PublicArticle article, String redirectSlug) {
    }

    public ArticleLookup bySlug(String slug) {
        var published = articles.findBySlugAndStatus(slug, ArticleStatus.PUBLISHED);
        if (published.isPresent()) {
            return new ArticleLookup(views.publicArticle(published.get()), null);
        }
        return slugHistory.findById(slug)
                .flatMap(h -> articles.findById(h.getArticleId()))
                .filter(Article::isPublished)
                .map(a -> new ArticleLookup(null, a.getSlug()))
                .orElseThrow(ApiException::notFound);
    }

    public List<PublicTerm> categories() {
        return articles.publicCategories().stream().map(PublicContentService::term).toList();
    }

    public PublicTerm category(String slug) {
        Category c = categories.findBySlug(slug).orElseThrow(ApiException::notFound);
        return new PublicTerm(c.getSlug(), c.getName(), articles.countPublishedInCategory(slug));
    }

    public List<PublicTerm> tags() {
        return articles.publicTags().stream().map(PublicContentService::term).toList();
    }

    public PublicTerm tag(String slug) {
        Tag t = tags.findBySlug(slug).orElseThrow(ApiException::notFound);
        return new PublicTerm(t.getSlug(), t.getName(), articles.countPublishedWithTag(slug));
    }

    public Sitemap sitemap() {
        return new Sitemap(entries(articles.sitemapArticles()), entries(articles.sitemapCategories()),
                entries(articles.sitemapTags()));
    }

    private static List<SitemapEntry> entries(List<Object[]> rows) {
        return rows.stream().map(r -> new SitemapEntry((String) r[0], (Instant) r[1])).toList();
    }

    private static PublicTerm term(Object[] r) {
        return new PublicTerm((String) r[0], (String) r[1], ((Number) r[2]).longValue());
    }
}
