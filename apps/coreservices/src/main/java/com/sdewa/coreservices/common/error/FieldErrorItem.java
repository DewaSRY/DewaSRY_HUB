package com.sdewa.coreservices.common.error;

/** One entry of the error envelope's {@code error[]} list. */
public record FieldErrorItem(String field, String message) {
}
