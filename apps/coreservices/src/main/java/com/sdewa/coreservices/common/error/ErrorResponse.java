package com.sdewa.coreservices.common.error;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.util.List;

/** Error envelope (ADR-003 §3.5): {@code { code, message, error[] }}. */
@JsonPropertyOrder({"code", "message", "error"})
public record ErrorResponse(int code, String message, List<FieldErrorItem> error) {

    public static ErrorResponse of(ErrorReason reason) {
        return new ErrorResponse(reason.status().value(), reason.message(), List.of());
    }
}
