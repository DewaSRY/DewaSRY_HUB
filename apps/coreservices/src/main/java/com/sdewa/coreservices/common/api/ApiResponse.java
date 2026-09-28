package com.sdewa.coreservices.common.api;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

/** Plain success envelope (ADR-003 §3.5): {@code { data, code, message }}. */
@JsonPropertyOrder({"data", "code", "message"})
public record ApiResponse<T>(T data, int code, String message) {
}
