package com.sdewa.coreservices.common.api;

/** Integer rupiah plus currency code (ADR-003 §3.3). */
public record Money(long amount, String currency) {

    public static final String IDR = "IDR";

    public static Money idr(long amount) {
        return new Money(amount, IDR);
    }
}
