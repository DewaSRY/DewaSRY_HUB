package com.sdewa.coreservices.admin;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.PagedResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.engagement.CommentStatus;
import com.sdewa.coreservices.engagement.EngagementDtos.AdminComment;
import com.sdewa.coreservices.engagement.EngagementService;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/** Admin 6.8 — Comments (UC-26, ADR-010): list, hide, show. */
@RestController
@RequestMapping("/admin/comments")
public class AdminCommentController {

    private static final Map<String, String> SORT = Map.of("createdAt", "createdAt");

    private final EngagementService engagement;

    public AdminCommentController(EngagementService engagement) {
        this.engagement = engagement;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<AdminComment>> list(@RequestParam(required = false) UUID articleId,
                                                            @RequestParam(required = false) String status,
                                                            @RequestParam(required = false) Integer page,
                                                            @RequestParam(required = false) Integer limit,
                                                            @RequestParam(required = false) String sort) {
        PageQuery pq = PageQuery.parse(page, limit, sort, SORT, "createdAt", Sort.Direction.DESC);
        EngagementService.AdminCommentPage r = engagement.adminList(articleId, parseStatus(status), pq);
        return Responses.page(r.items(), r.total(), pq.page(), pq.limit(), null);
    }

    @PostMapping("/{id}/hide")
    public ResponseEntity<ApiResponse<AdminComment>> hide(@PathVariable UUID id) {
        return Responses.ok(engagement.setStatus(id, CommentStatus.HIDDEN), Responses.MSG_UPDATED);
    }

    @PostMapping("/{id}/show")
    public ResponseEntity<ApiResponse<AdminComment>> show(@PathVariable UUID id) {
        return Responses.ok(engagement.setStatus(id, CommentStatus.VISIBLE), Responses.MSG_UPDATED);
    }

    private static CommentStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return CommentStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            throw ApiException.validation("status", "Must be VISIBLE or HIDDEN.");
        }
    }
}
