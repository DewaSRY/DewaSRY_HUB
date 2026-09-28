package com.sdewa.coreservices.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/**
 * {@code meta} of the paginated envelope. {@code summary} is only present on endpoints that
 * define one (for example {@code GET /admin/transactions}).
 */
@JsonPropertyOrder({"total", "page", "limit", "total_page", "summary"})
public record PageMeta(
        long total,
        int page,
        int limit,
        @JsonProperty("total_page") int totalPage,
        @JsonInclude(JsonInclude.Include.NON_NULL) Object summary) {

    public static PageMeta of(long total, int page, int limit, Object summary) {
        int totalPage = limit <= 0 ? 0 : (int) ((total + limit - 1) / limit);
        return new PageMeta(total, page, limit, totalPage, summary);
    }
}
