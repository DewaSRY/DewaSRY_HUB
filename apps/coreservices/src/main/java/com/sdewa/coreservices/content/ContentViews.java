package com.sdewa.coreservices.content;

import com.sdewa.coreservices.common.util.JsonText;
import com.sdewa.coreservices.config.HubProperties;
import com.sdewa.coreservices.content.ContentDtos.AdminArticle;
import com.sdewa.coreservices.content.ContentDtos.AdminArticleSummary;
import com.sdewa.coreservices.content.ContentDtos.AdminTranslation;
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

/**
 * Maps articles to their API shapes, picking the translation to show. Must be called inside a
 * transaction (lazy associations).
 */
@Component
public class ContentViews {

    private final ImageViews images;
    private final JsonText json;
    private final HubProperties properties;
    private final ContentLocales locales;

    public ContentViews(ImageViews images, JsonText json, HubProperties properties, ContentLocales locales) {
        this.images = images;
        this.json = json;
        this.properties = properties;
        this.locales = locales;
    }

    /** The translation to show for {@code requested} (see {@link ContentLocales#pick}); never null for a saved article. */
    public ArticleTranslation display(Article a, String requested) {
        String locale = locales.pick(a.getTranslations().keySet(), requested);
        return locale == null ? null : a.getTranslations().get(locale);
    }

    public List<String> localesOf(Article a) {
        return locales.sorted(a.getTranslations().keySet());
    }

    public ArticleSummary summary(Article a, String requested) {
        ArticleTranslation t = display(a, requested);
        return new ArticleSummary(a.getId(), a.getSlug(), t.getLocale(), localesOf(a), t.getTitle(), t.getExcerpt(),
                images.toView(a.getCoverImage()), term(a.getCategory()), tags(a), a.getPublishedAt(), a.getUpdatedAt());
    }

    public PublicArticle publicArticle(Article a, String requested) {
        ArticleTranslation t = display(a, requested);
        String metaTitle = t.getMetaTitle() != null ? t.getMetaTitle() : t.getTitle();
        String metaDescription = t.getMetaDescription() != null ? t.getMetaDescription()
                : t.getExcerpt() != null ? t.getExcerpt()
                : t.getBodyText().length() > 160 ? t.getBodyText().substring(0, 160) : t.getBodyText();
        String base = properties.getSiteBaseUrl().endsWith("/")
                ? properties.getSiteBaseUrl().substring(0, properties.getSiteBaseUrl().length() - 1) : properties.getSiteBaseUrl();
        // The canonical URL is the language the text is written in, so a fallback page is not a duplicate.
        return new PublicArticle(a.getId(), a.getSlug(), t.getLocale(), localesOf(a), t.getTitle(), t.getExcerpt(),
                images.toView(a.getCoverImage()), term(a.getCategory()), tags(a), a.getPublishedAt(), a.getUpdatedAt(),
                json.parse(t.getBody()), t.getBodySchemaVersion(), bodyImages(a), t.readingMinutes(), t.getWordCount(),
                metaTitle, metaDescription, base + "/" + t.getLocale() + "/blog/" + a.getSlug());
    }

    public AdminArticle admin(Article a, List<String> previousSlugs) {
        List<AdminTermRef> tagRefs = adminTags(a);
        ArticleTranslation display = display(a, null);
        Map<String, AdminTranslation> translations = new LinkedHashMap<>();
        for (String locale : localesOf(a)) {
            ArticleTranslation t = a.getTranslations().get(locale);
            translations.put(locale, new AdminTranslation(locale, t.getTitle(), t.getExcerpt(), json.parse(t.getBody()),
                    t.getBodySchemaVersion(), t.getMetaTitle(), t.getMetaDescription(), t.getWordCount(),
                    t.readingMinutes(), t.getUpdatedAt()));
        }
        return new AdminArticle(a.getId(), a.getSlug(), display == null ? "" : display.getTitle(), localesOf(a), translations,
                a.getCoverImage() == null ? null : a.getCoverImage().getId(),
                a.getCategory() == null ? null : a.getCategory().getId(), tagRefs.stream().map(AdminTermRef::id).toList(),
                a.getVersion(), a.getStatus(), images.toView(a.getCoverImage()), adminTerm(a.getCategory()), tagRefs,
                bodyImages(a), a.getPublishedAt(), a.getCreatedAt(), a.getUpdatedAt(), previousSlugs, null);
    }

    public AdminArticleSummary adminSummary(Article a) {
        ArticleTranslation t = display(a, null);
        return new AdminArticleSummary(a.getId(), a.getSlug(), t == null ? "" : t.getTitle(), t == null ? null : t.getExcerpt(),
                localesOf(a), a.getStatus(), images.toView(a.getCoverImage()), adminTerm(a.getCategory()), adminTags(a),
                t == null ? 0 : t.getWordCount(), a.getVersion(), a.getPublishedAt(), a.getCreatedAt(), a.getUpdatedAt());
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
