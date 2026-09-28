package com.sdewa.coreservices.common.error;

import java.util.List;

/** Business error that maps to one {@link ErrorReason} and the error envelope. */
public class ApiException extends RuntimeException {

    private final ErrorReason reason;
    private final List<FieldErrorItem> errors;

    public ApiException(ErrorReason reason) {
        this(reason, reason.message(), List.of());
    }

    public ApiException(ErrorReason reason, String message) {
        this(reason, message, List.of());
    }

    public ApiException(ErrorReason reason, List<FieldErrorItem> errors) {
        this(reason, reason.message(), errors);
    }

    public ApiException(ErrorReason reason, String message, List<FieldErrorItem> errors) {
        super(message);
        this.reason = reason;
        this.errors = List.copyOf(errors);
    }

    public ErrorReason reason() {
        return reason;
    }

    public List<FieldErrorItem> errors() {
        return errors;
    }

    public static ApiException notFound() {
        return new ApiException(ErrorReason.NOT_FOUND);
    }

    public static ApiException validation(String field, String message) {
        return new ApiException(ErrorReason.VALIDATION_FAILED, List.of(new FieldErrorItem(field, message)));
    }
}
