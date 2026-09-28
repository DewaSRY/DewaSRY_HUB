package com.sdewa.coreservices.common.api;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.net.URI;
import java.util.List;
import java.util.function.Function;

/** Helpers that build the three ADR-003 envelopes with the matching HTTP status. */
public final class Responses {

    public static final String MSG_DATA = "Success retrieve data";
    public static final String MSG_LIST = "Success retrieve list";
    public static final String MSG_CREATED = "Success create data";
    public static final String MSG_UPDATED = "Success update data";

    private Responses() {
    }

    public static <T> ResponseEntity<ApiResponse<T>> ok(T data) {
        return status(HttpStatus.OK, data, MSG_DATA);
    }

    public static <T> ResponseEntity<ApiResponse<T>> ok(T data, String message) {
        return status(HttpStatus.OK, data, message);
    }

    public static <T> ResponseEntity<ApiResponse<T>> created(T data) {
        return status(HttpStatus.CREATED, data, MSG_CREATED);
    }

    public static <T> ResponseEntity<ApiResponse<T>> created(URI location, T data) {
        return ResponseEntity.created(location).body(new ApiResponse<>(data, 201, MSG_CREATED));
    }

    public static <T> ResponseEntity<ApiResponse<T>> status(HttpStatus status, T data, String message) {
        return ResponseEntity.status(status).body(new ApiResponse<>(data, status.value(), message));
    }

    public static <T> ResponseEntity<Void> noContent() {
        return ResponseEntity.noContent().build();
    }

    public static <E, T> ResponseEntity<PagedResponse<T>> page(Page<E> page, Function<E, T> mapper) {
        return page(page.getContent().stream().map(mapper).toList(), page.getTotalElements(),
                page.getNumber() + 1, page.getSize(), null);
    }

    public static <T> ResponseEntity<PagedResponse<T>> page(List<T> items, long total, int page, int limit, Object summary) {
        return ResponseEntity.ok(new PagedResponse<>(items, 200, MSG_LIST, PageMeta.of(total, page, limit, summary)));
    }
}
