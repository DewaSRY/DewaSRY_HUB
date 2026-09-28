package com.sdewa.coreservices.content.revalidation;

import java.util.List;

/** {@code "revalidation": { status: OK | PENDING_RETRY, paths }} (ADR-003 §10.3). */
public record RevalidationResult(String status, List<String> paths) {

    public static final String OK = "OK";
    public static final String PENDING_RETRY = "PENDING_RETRY";
}
