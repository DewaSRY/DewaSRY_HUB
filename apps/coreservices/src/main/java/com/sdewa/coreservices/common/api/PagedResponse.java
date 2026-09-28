package com.sdewa.coreservices.common.api;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.util.List;

/** Paginated success envelope (ADR-003 §3.5): {@code { data, code, message, meta }}. */
@JsonPropertyOrder({"data", "code", "message", "meta"})
public record PagedResponse<T>(List<T> data, int code, String message, PageMeta meta) {
}
