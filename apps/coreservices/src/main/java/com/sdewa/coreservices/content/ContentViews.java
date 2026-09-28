package com.sdewa.coreservices.content;

import com.sdewa.coreservices.common.util.JsonText;
import com.sdewa.coreservices.config.HubProperties;
import com.sdewa.coreservices.content.ContentDtos.AdminArticle;
import com.sdewa.coreservices.content.ContentDtos.AdminArticleSummary;
import com.sdewa.coreservices.content.ContentDtos.AdminTermRef;
import com.sdewa.coreservices.content.ContentDtos.ArticleSummary;
import com.sdewa.coreservices.content.ContentDtos.PublicArticle;
import com.sdewa.coreservices.content.ContentDtos.TermRef;
import com.sdewa.coreservices.media.Image;
import com.sdewa.coreservices.media.ImageViews;
import com.sdewa.coreservices.media.MediaDtos.ImageView;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Maps articles to their API shapes. Must be called inside a transaction (lazy associations). */
@Component
public class ContentViews {

    private final ImageViews images;
    private final JsonText json;
    private final HubProperties properties;

    public ContentViews(ImageViews images, JsonText json, HubProperties properties) {
        this.images = images;
        this.json = json;
        this.properties = properties;
    }

    public ArticleSummary summary(Article a) {
        return new ArticleSummary(a.getId(), a.getSlug(), a.getTitle(), a.getExcerpt(), images.toView(a.getCoverImage()),
                term(a.getCategory()), tags(a), a.getPublishedAt(), a.getUpdatedAt());
    }

    public PublicArticle publicArticle(Article a) {
        String metaTitle = a.getMetaTitle() != null ? a.getMetaTitle() : a.getTitle();
        String metaDescription = a.getMetaDescription() != null ? a.getMetaDescription()
                : a.getExcerpt() != null ? a.getExcerpt()
                : a.getBodyText().length() > 160 ? a.getBodyText().substring(0, 160) : a.getBodyText();
        String base = properties.getSiteBaseUrl().endsWith("/")
                ? properties.getSiteBaseUrl().substring(0, properties.getSiteBaseUrl().length() - 1) : properties.getSiteBaseUrl();
        return new PublicArticle(a.getId(), a.getSlug(), a.getTitle(), a.getExcerpt(), images.toView(a.getCoverImage()),
                term(a.getCategory()), tags(a), a.getPublishedAt(), a.getUpdatedAt(), json.parse(a.getBody()),
                a.getBodySchemaVersion(), bodyImages(a), a.readingMinutes(), a.getWordCount(), metaTitle, metaDescription,
                base + "/blog/" + a.getSlug());
    }

    public AdminArticle admin(Article a, List<String> previousSlugs) {
        List<AdminTermRef> tagRefs = adminTags(a);
        return new AdminArticle(a.getId(), a.getTitle(), a.getSlug(), a.getExcerpt(), json.parse(a.getBody()),
                a.getBodySchemaVersion(), a.getCoverImage() == null ? null : a.getCoverImage().getId(),
                a.getCategory() == null ? null : a.getCategory().getId(), tagRefs.stream().map(AdminTermRef::id).toList(),
                a.getMetaTitle(), a.getMetaDescription(), a.getVersion(), a.getStatus(), images.toView(a.getCoverImage()),
                adminTerm(a.getCategory()), tagRefs, bodyImages(a), a.getWordCount(), a.readingMinutes(), a.getPublishedAt(),
                a.getCreatedAt(), a.getUpdatedAt(), previousSlugs, null);
    }

    public AdminArticleSummary adminSummary(Article a) {
        return new AdminArticleSummary(a.getId(), a.getSlug(), a.getTitle(), a.getExcerpt(), a.getStatus(),
                images.toView(a.getCoverImage()), adminTerm(a.getCategory()), adminTags(a), a.getWordCount(), a.getVersion(),
                a.getPublishedAt(), a.getCreatedAt(), a.getUpdatedAt());
    }

    /** ADR-009 §4.3: the images used by the body, keyed by id. */
    private Map<UUID, ImageView> bodyImages(Article a) {
        Map<UUID, ImageView> map = new LinkedHashMap<>();
        a.getBodyImages().stream().sorted(Comparator.comparing(Image::getId)).forEach(i -> map.put(i.getId(), images.toView(i)));
        return map;
    }

    private static TermRef term(TaxonomyTerm t) {
        return t == null ? null : new TermRef(t.getSlug(), t.getName());
    }

    private static AdminTermRef adminTerm(TaxonomyTerm t) {
        return t == null ? null : new AdminTermRef(t.getId(), t.getSlug(), t.getName());
    }

    private static List<TermRef> tags(Article a) {
        return a.getTags().stream().sorted(Comparator.comparing(Tag::getName)).map(t -> new TermRef(t.getSlug(), t.getName())).toList();
    }

    private static List<AdminTermRef> adminTags(Article a) {
        return a.getTags().stream().sorted(Comparator.comparing(Tag::getName))
                .map(t -> new AdminTermRef(t.getId(), t.getSlug(), t.getName())).toList();
    }
}
