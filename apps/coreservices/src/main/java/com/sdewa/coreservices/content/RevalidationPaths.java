package com.sdewa.coreservices.content;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** Site paths to revalidate (ADR-003 §11.1). */
final class RevalidationPaths {

    static final String BLOG = "/blog";
    static final String SITEMAP = "/sitemap.xml";

    private RevalidationPaths() {
    }

    static String article(String slug) {
        return "/blog/" + slug;
    }

    static String category(String slug) {
        return "/blog/category/" + slug;
    }

    static String tag(String slug) {
        return "/blog/tag/" + slug;
    }

    /** Article page, blog list, its category and tag pages, and the sitemap. */
    static List<String> forArticle(Article a, Collection<String> extraArticleSlugs) {
        List<String> paths = new ArrayList<>();
        paths.add(article(a.getSlug()));
        extraArticleSlugs.forEach(s -> paths.add(article(s)));
        paths.add(BLOG);
        if (a.getCategory() != null) {
            paths.add(category(a.getCategory().getSlug()));
        }
        a.getTags().forEach(t -> paths.add(tag(t.getSlug())));
        paths.add(SITEMAP);
        return paths;
    }
}
