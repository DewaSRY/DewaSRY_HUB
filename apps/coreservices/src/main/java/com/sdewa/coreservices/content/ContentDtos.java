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

    public record ArticleSummary(UUID id, String slug, String title, String excerpt, ImageView coverImage, TermRef category,
                                 List<TermRef> tags, Instant publishedAt, Instant updatedAt) {
    }

    public record PublicArticle(UUID id, String slug, String title, String excerpt, ImageView coverImage, TermRef category,
                                List<TermRef> tags, Instant publishedAt, Instant updatedAt, JsonNode body,
                                int bodySchemaVersion, Map<UUID, ImageView> images, int readingMinutes, int wordCount,
                                String metaTitle, String metaDescription, String canonicalUrl) {
    }

    public record SlugRedirect(String slug) {
    }

    public record PublicTerm(String slug, String name, long articleCount) {
    }

    public record SitemapEntry(String slug, Instant updatedAt) {
    }

    public record Sitemap(List<SitemapEntry> articles, List<SitemapEntry> categories, List<SitemapEntry> tags) {
    }

    public record ArticleInput(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 120) String slug,
            @Size(max = 500) String excerpt,
            JsonNode body,
            Integer bodySchemaVersion,
            UUID coverImageId,
            UUID categoryId,
            List<UUID> tagIds,
            @Size(max = 200) String metaTitle,
            @Size(max = 320) String metaDescription,
            Integer version) {
    }

    public record AdminArticle(UUID id, String title, String slug, String excerpt, JsonNode body, int bodySchemaVersion,
                               UUID coverImageId, UUID categoryId, List<UUID> tagIds, String metaTitle,
                               String metaDescription, int version, ArticleStatus status, ImageView coverImage,
                               AdminTermRef category, List<AdminTermRef> tags, Map<UUID, ImageView> images, int wordCount,
                               int readingMinutes, Instant publishedAt, Instant createdAt, Instant updatedAt,
                               List<String> previousSlugs, RevalidationResult revalidation) {
        public AdminArticle withRevalidation(RevalidationResult r) {
            return new AdminArticle(id, title, slug, excerpt, body, bodySchemaVersion, coverImageId, categoryId, tagIds,
                    metaTitle, metaDescription, version, status, coverImage, category, tags, images, wordCount,
                    readingMinutes, publishedAt, createdAt, updatedAt, previousSlugs, r);
        }
    }

    public record AdminArticleSummary(UUID id, String slug, String title, String excerpt, ArticleStatus status,
                                      ImageView coverImage, AdminTermRef category, List<AdminTermRef> tags, int wordCount,
                                      int version, Instant publishedAt, Instant createdAt, Instant updatedAt) {
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
