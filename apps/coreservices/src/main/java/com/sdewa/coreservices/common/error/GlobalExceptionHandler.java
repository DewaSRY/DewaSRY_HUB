package com.sdewa.coreservices.common.error;

import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BindException;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.ArrayList;
import java.util.List;

/** Maps every exception to the ADR-003 error envelope. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException ex) {
        if (ex.reason().status().is5xxServerError()) {
            log.warn("API error {}: {}", ex.reason(), ex.getMessage());
        }
        return build(ex.reason(), ex.getMessage(), ex.errors());
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<ErrorResponse> handleBind(BindException ex) {
        List<FieldErrorItem> items = new ArrayList<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(fe -> items.add(new FieldErrorItem(fe.getField(), fe.getDefaultMessage())));
        ex.getBindingResult().getGlobalErrors()
                .forEach(ge -> items.add(new FieldErrorItem(ge.getObjectName(), ge.getDefaultMessage())));
        return build(ErrorReason.VALIDATION_FAILED, ErrorReason.VALIDATION_FAILED.message(), items);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErrorResponse> handleMethodValidation(HandlerMethodValidationException ex) {
        List<FieldErrorItem> items = new ArrayList<>();
        ex.getParameterValidationResults().forEach(r -> {
            String name = r.getMethodParameter().getParameterName();
            r.getResolvableErrors().forEach(e -> items.add(new FieldErrorItem(name, e.getDefaultMessage())));
        });
        return build(ErrorReason.VALIDATION_FAILED, ErrorReason.VALIDATION_FAILED.message(), items);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraint(ConstraintViolationException ex) {
        List<FieldErrorItem> items = ex.getConstraintViolations().stream()
                .map(v -> {
                    String path = v.getPropertyPath().toString();
                    int dot = path.lastIndexOf('.');
                    return new FieldErrorItem(dot >= 0 ? path.substring(dot + 1) : path, v.getMessage());
                })
                .toList();
        return build(ErrorReason.VALIDATION_FAILED, ErrorReason.VALIDATION_FAILED.message(), items);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return build(ErrorReason.VALIDATION_FAILED, ErrorReason.VALIDATION_FAILED.message(),
                List.of(new FieldErrorItem(ex.getName(), "Has an invalid value.")));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(MissingServletRequestParameterException ex) {
        return build(ErrorReason.VALIDATION_FAILED, ErrorReason.VALIDATION_FAILED.message(),
                List.of(new FieldErrorItem(ex.getParameterName(), "Is required.")));
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ErrorResponse> handleMissingPart(MissingServletRequestPartException ex) {
        return build(ErrorReason.VALIDATION_FAILED, ErrorReason.VALIDATION_FAILED.message(),
                List.of(new FieldErrorItem(ex.getRequestPartName(), "Is required.")));
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<ErrorResponse> handleMissingHeader(MissingRequestHeaderException ex) {
        return build(ErrorReason.VALIDATION_FAILED, ErrorReason.VALIDATION_FAILED.message(),
                List.of(new FieldErrorItem(ex.getHeaderName(), "Is required.")));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleNotReadable(HttpMessageNotReadableException ex) {
        return build(ErrorReason.MALFORMED_REQUEST, ErrorReason.MALFORMED_REQUEST.message(), List.of());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleTooLarge(MaxUploadSizeExceededException ex) {
        return build(ErrorReason.PAYLOAD_TOO_LARGE, ErrorReason.PAYLOAD_TOO_LARGE.message(), List.of());
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ErrorResponse> handleMultipart(MultipartException ex) {
        return build(ErrorReason.MALFORMED_REQUEST, "Malformed multipart request", List.of());
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMediaType(HttpMediaTypeNotSupportedException ex) {
        return build(ErrorReason.UNSUPPORTED_MEDIA_TYPE, "Unsupported content type", List.of());
    }

    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<ErrorResponse> handleNotAcceptable(HttpMediaTypeNotAcceptableException ex) {
        return build(ErrorReason.NOT_ACCEPTABLE, ErrorReason.NOT_ACCEPTABLE.message(), List.of());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethod(HttpRequestMethodNotSupportedException ex) {
        return build(ErrorReason.METHOD_NOT_ALLOWED, ErrorReason.METHOD_NOT_ALLOWED.message(), List.of());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException ex) {
        return build(ErrorReason.NOT_FOUND, ErrorReason.NOT_FOUND.message(), List.of());
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
        return build(ErrorReason.VERSION_CONFLICT, ErrorReason.VERSION_CONFLICT.message(), List.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return build(ErrorReason.FORBIDDEN, ErrorReason.FORBIDDEN.message(), List.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);
        return build(ErrorReason.INTERNAL_ERROR, ErrorReason.INTERNAL_ERROR.message(), List.of());
    }

    private ResponseEntity<ErrorResponse> build(ErrorReason reason, String message, List<FieldErrorItem> errors) {
        return ResponseEntity.status(reason.status())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(new ErrorResponse(reason.status().value(), message, errors));
    }
}
