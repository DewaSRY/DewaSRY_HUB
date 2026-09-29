package com.sdewa.coreservices.engagement;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.PageMeta;
import com.sdewa.coreservices.common.api.PagedResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.engagement.EngagementDtos.CommentView;
import com.sdewa.coreservices.engagement.EngagementDtos.InteractionSummary;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Group 1 — public interaction reads (ADR-010 §7.1, UC-22). Read in the browser, never in ISR, so
 * the cache is short (§7.4) and no revalidation is sent when they change.
 */
@RestController
@RequestMapping("/public/articles/{slug}")
public class PublicEngagementController {

    static final String INTERACTION_CACHE = "public, max-age=10, stale-while-revalidate=60";
    private static final Map<String, String> SORT = Map.of("createdAt", "createdAt");

    private final EngagementService engagement;

    public PublicEngagementController(EngagementService engagement) {
        this.engagement = engagement;
    }

    @GetMapping("/interactions")
    public ResponseEntity<ApiResponse<InteractionSummary>> interactions(@PathVariable String slug) {
        InteractionSummary summary = engagement.summary(engagement.publishedArticleId(slug));
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, INTERACTION_CACHE)
                .body(new ApiResponse<>(summary, 200, Responses.MSG_DATA));
    }

    @GetMapping("/comments")
    public ResponseEntity<PagedResponse<CommentView>> comments(@PathVariable String slug,
                                                               @RequestParam(required = false) Integer page,
                                                               @RequestParam(required = false) Integer limit,
                                                               @RequestParam(required = false) String sort) {
        PageQuery q = PageQuery.parse(page, limit, sort, SORT, "createdAt", Sort.Direction.DESC);
        EngagementService.CommentPage r = engagement.comments(engagement.publishedArticleId(slug), q);
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, INTERACTION_CACHE)
                .body(new PagedResponse<>(r.items(), 200, Responses.MSG_LIST, PageMeta.of(r.total(), q.page(), q.limit(), null)));
    }
}
