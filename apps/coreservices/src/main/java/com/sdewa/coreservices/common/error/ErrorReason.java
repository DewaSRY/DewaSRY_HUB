package com.sdewa.coreservices.common.error;

import org.springframework.http.HttpStatus;

/**
 * Error reasons from ADR-003 §3.5 and §12 (plus the SSO / link-preview additions). The reason name
 * is a documentation label; it selects the HTTP status and the fixed {@code message} text.
 */
public enum ErrorReason {
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Validation failed"),
    MALFORMED_REQUEST(HttpStatus.BAD_REQUEST, "Malformed request body"),
    IMAGE_UNREADABLE(HttpStatus.BAD_REQUEST, "The image could not be read"),
    INVALID_GRANT(HttpStatus.BAD_REQUEST, "The authorization code is invalid, expired, or already used"),
    URL_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "The URL is not allowed"),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Authentication required"),
    INVALID_CLIENT(HttpStatus.UNAUTHORIZED, "Invalid client credential"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "You are not allowed to do this"),
    PRODUCT_INACTIVE(HttpStatus.FORBIDDEN, "The product is inactive"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Resource not found"),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed"),
    NOT_ACCEPTABLE(HttpStatus.NOT_ACCEPTABLE, "Not acceptable"),
    CONFLICT(HttpStatus.CONFLICT, "The request conflicts with the current state"),
    SLUG_TAKEN(HttpStatus.CONFLICT, "The slug is already used"),
    NAME_TAKEN(HttpStatus.CONFLICT, "The name is already used"),
    CODE_TAKEN(HttpStatus.CONFLICT, "The code is already used"),
    VERSION_CONFLICT(HttpStatus.CONFLICT, "The article was changed by someone else; reload before saving"),
    IMAGE_IN_USE(HttpStatus.CONFLICT, "The image is used by articles"),
    CATEGORY_IN_USE(HttpStatus.CONFLICT, "The category still has articles"),
    PLAN_SOLD(HttpStatus.CONFLICT, "The plan was already sold; price and billing period cannot change"),
    CREDENTIAL_LIMIT(HttpStatus.CONFLICT, "The product already has two active credentials"),
    LAST_CREDENTIAL(HttpStatus.CONFLICT, "Cannot revoke the last active credential; create a new one first"),
    PLAN_NOT_PURCHASABLE(HttpStatus.CONFLICT, "The plan cannot be purchased"),
    PLAN_CHANGE_NOT_SUPPORTED(HttpStatus.CONFLICT, "Changing plan during an active period is not supported"),
    FREE_PLAN_EXISTS(HttpStatus.CONFLICT, "The product already has an active free plan"),
    PAYLOAD_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "The upload is too large"),
    UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only JPEG, PNG, or WebP images are supported"),
    ARTICLE_INCOMPLETE(HttpStatus.UNPROCESSABLE_CONTENT, "The article is missing required fields for publishing"),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "Too many requests"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error"),
    UPSTREAM_ERROR(HttpStatus.BAD_GATEWAY, "An upstream service failed");

    private final HttpStatus status;
    private final String message;

    ErrorReason(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus status() {
        return status;
    }

    public String message() {
        return message;
    }
}
