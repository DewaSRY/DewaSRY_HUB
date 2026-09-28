package com.sdewa.coreservices.common.api;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.error.FieldErrorItem;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * A partial {@code PATCH} body (ADR-003 §3.3): only fields that are present change. Wraps the raw
 * JSON object so "absent" and "explicit null" can be told apart.
 */
public final class PatchBody {

    private final JsonNode node;
    private final List<FieldErrorItem> errors = new ArrayList<>();

    private PatchBody(JsonNode node) {
        this.node = node;
    }

    public static PatchBody of(JsonNode node, Set<String> allowed) {
        if (node == null || !node.isObject()) {
            throw new ApiException(ErrorReason.MALFORMED_REQUEST, "The body must be a JSON object");
        }
        PatchBody body = new PatchBody(node);
        for (String name : node.propertyNames()) {
            if (!allowed.contains(name)) {
                body.errors.add(new FieldErrorItem(name, "Cannot be changed."));
            }
        }
        return body;
    }

    public boolean has(String field) {
        return node.has(field);
    }

    public JsonNode raw(String field) {
        return node.get(field);
    }

    /** String value; explicit {@code null} returns null. Records an error for non-strings. */
    public String string(String field) {
        JsonNode v = node.get(field);
        if (v == null || v.isNull()) {
            return null;
        }
        if (!v.isString()) {
            errors.add(new FieldErrorItem(field, "Must be a string."));
            return null;
        }
        return v.stringValue();
    }

    public Boolean bool(String field) {
        JsonNode v = node.get(field);
        if (v == null || v.isNull()) {
            errors.add(new FieldErrorItem(field, "Must be true or false."));
            return null;
        }
        if (!v.isBoolean()) {
            errors.add(new FieldErrorItem(field, "Must be true or false."));
            return null;
        }
        return v.booleanValue();
    }

    public void error(String field, String message) {
        errors.add(new FieldErrorItem(field, message));
    }

    public List<FieldErrorItem> errors() {
        return errors;
    }

    public void throwIfInvalid() {
        if (!errors.isEmpty()) {
            throw new ApiException(ErrorReason.VALIDATION_FAILED, errors);
        }
    }
}
