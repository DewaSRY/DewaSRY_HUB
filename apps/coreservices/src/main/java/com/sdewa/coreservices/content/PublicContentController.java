package com.sdewa.coreservices.content;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.PagedResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.config.WebConfig;
import com.sdewa.coreservices.content.ContentDtos.ArticleSummary;
import com.sdewa.coreservices.content.ContentDtos.PublicTerm;
import com.sdewa.coreservices.content.ContentDtos.Sitemap;
import com.sdewa.coreservices.content.ContentDtos.SlugRedirect;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/** Group 1 — Public content (ADR-003 §5). */
@RestController
@RequestMapping("/public")
public class PublicContentController {

    private static final Map<String, String> SORT = Map.of("publishedAt", "publishedAt");

    private final PublicContentService content;

    public PublicContentController(PublicContentService content) {
        this.content = content;
    }

    @GetMapping("/articles")
    public ResponseEntity<PagedResponse<ArticleSummary>> articles(@RequestParam(required = false) String category,
                                                                  @RequestParam(required = false) String tag,
                                                                  @RequestParam(required = false) Integer page,
                                                                  @RequestParam(required = false) Integer limit,
                                                                  @RequestParam(required = false) String sort) {
        PageQuery q = PageQuery.parse(page, limit, sort, SORT, "publishedAt", Sort.Direction.DESC);
        PublicContentService.ListResult r = content.list(category, tag, q);
        return Responses.page(r.items(), r.total(), q.page(), q.limit(), null);
    }

    /** 200 with the article, or 301 to the new slug for an old slug (ADR-003 §5.3). */
    @GetMapping("/articles/{slug}")
    public ResponseEntity<? extends ApiResponse<?>> article(@PathVariable String slug) {
        PublicContentService.ArticleLookup lookup = content.bySlug(slug);
        if (lookup.redirectSlug() != null) {
            String location = WebConfig.API_PREFIX + "/public/articles/" + UriUtils.encodePathSegment(lookup.redirectSlug(), StandardCharsets.UTF_8);
            return ResponseEntity.status(HttpStatus.MOVED_PERMANENTLY)
                    .header(HttpHeaders.LOCATION, location)
                    .body(new ApiResponse<>(new SlugRedirect(lookup.redirectSlug()), 301, "Moved permanently"));
        }
        return Responses.ok(lookup.article());
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<PublicTerm>>> categories() {
        return Responses.ok(content.categories(), Responses.MSG_LIST);
    }

    @GetMapping("/categories/{slug}")
    public ResponseEntity<ApiResponse<PublicTerm>> category(@PathVariable String slug) {
        return Responses.ok(content.category(slug));
    }

    @GetMapping("/tags")
    public ResponseEntity<ApiResponse<List<PublicTerm>>> tags() {
        return Responses.ok(content.tags(), Responses.MSG_LIST);
    }

    @GetMapping("/tags/{slug}")
    public ResponseEntity<ApiResponse<PublicTerm>> tag(@PathVariable String slug) {
        return Responses.ok(content.tag(slug));
    }

    @GetMapping("/sitemap")
    public ResponseEntity<ApiResponse<Sitemap>> sitemap() {
        return Responses.ok(content.sitemap());
    }
}
