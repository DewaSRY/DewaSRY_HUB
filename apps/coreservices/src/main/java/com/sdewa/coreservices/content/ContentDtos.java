package com.sdewa.coreservices.content;

import com.sdewa.coreservices.content.revalidation.RevalidationResult;
import com.sdewa.coreservices.media.MediaDtos.ImageView;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Content shapes (ADR-003 §5.1, §10.3 as amended by ADR-009 §9). */
public final class ContentDtos {

    private ContentDtos() {
    }

    public record TermRef(String slug, String name) {
    }

    public record AdminTermRef(UUID id, String slug, String name) {
    }

    /** {@code locale} is the language of the text; {@code availableLocales} every language the article has. */
    public record ArticleSummary(UUID id, String slug, String locale, List<String> availableLocales, String title,
                                 String excerpt, ImageView coverImage, TermRef category, List<TermRef> tags,
                                 Instant publishedAt, Instant updatedAt) {
    }

    /**
     * {@code locale} is the language actually returned: the requested one, or a fallback when the
     * article has no translation for it.
     */
    public record PublicArticle(UUID id, String slug, String locale, List<String> availableLocales, String title,
                                String excerpt, ImageView coverImage, TermRef category, List<TermRef> tags,
                                Instant publishedAt, Instant updatedAt, JsonNode body, int bodySchemaVersion,
                                Map<UUID, ImageView> images, int readingMinutes, int wordCount, String metaTitle,
                                String metaDescription, String canonicalUrl) {
    }

    public record SlugRedirect(String slug) {
    }

    public record PublicTerm(String slug, String name, long articleCount) {
    }

    public record SitemapEntry(String slug, Instant updatedAt) {
    }

    /** {@code locales}: the languages the article is published in. */
    public record ArticleSitemapEntry(String slug, Instant updatedAt, List<String> locales) {
    }

    public record Sitemap(List<ArticleSitemapEntry> articles, List<SitemapEntry> categories, List<SitemapEntry> tags) {
    }

    /**
     * One language of an {@link ArticleInput}. Lengths are checked by the service so that errors
     * name {@code translations.<locale>.<field>}.
     */
    public record TranslationInput(String title, String excerpt, JsonNode body, Integer bodySchemaVersion,
                                   String metaTitle, String metaDescription) {
    }

    /**
     * The whole article. {@code translations} is keyed by locale and replaces the stored set: a
     * language left out is removed. At least one is required.
     */
    public record ArticleInput(
            @Size(max = 120) String slug,
            UUID coverImageId,
            UUID categoryId,
            List<UUID> tagIds,
            Map<String, TranslationInput> translations,
            Integer version) {
    }

    public record AdminTranslation(String locale, String title, String excerpt, JsonNode body, int bodySchemaVersion,
                                   String metaTitle, String metaDescription, int wordCount, int readingMinutes,
                                   Instant updatedAt) {
    }

    /** {@code title} is the display title (fallback language first); {@code locales} is in configured order. */
    public record AdminArticle(UUID id, String slug, String title, List<String> locales,
                               Map<String, AdminTranslation> translations, UUID coverImageId, UUID categoryId,
                               List<UUID> tagIds, int version, ArticleStatus status, ImageView coverImage,
                               AdminTermRef category, List<AdminTermRef> tags, Map<UUID, ImageView> images,
                               Instant publishedAt, Instant createdAt, Instant updatedAt, List<String> previousSlugs,
                               RevalidationResult revalidation) {
        public AdminArticle withRevalidation(RevalidationResult r) {
            return new AdminArticle(id, slug, title, locales, translations, coverImageId, categoryId, tagIds, version,
                    status, coverImage, category, tags, images, publishedAt, createdAt, updatedAt, previousSlugs, r);
        }
    }

    /** {@code title}, {@code excerpt} and {@code wordCount} come from the display language. */
    public record AdminArticleSummary(UUID id, String slug, String title, String excerpt, List<String> locales,
                                      ArticleStatus status, ImageView coverImage, AdminTermRef category,
                                      List<AdminTermRef> tags, int wordCount, int version, Instant publishedAt,
                                      Instant createdAt, Instant updatedAt) {
    }

    public record TermInput(@NotBlank @Size(max = 80) String name, @Size(max = 120) String slug) {
    }

    public record AdminTerm(UUID id, String name, String slug, long articleCount, long publishedCount,
                            @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
                            RevalidationResult revalidation) {
        public AdminTerm withRevalidation(RevalidationResult r) {
            return new AdminTerm(id, name, slug, articleCount, publishedCount, r);
        }
    }

    /** A committed change plus the site paths that must be revalidated. */
    public record Mutation<T>(T value, List<String> paths) {
    }
}
