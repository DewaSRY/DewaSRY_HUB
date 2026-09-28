package com.sdewa.coreservices.payment;

import java.util.Set;

/** ADR-002 §6.1. A transaction never goes back to PENDING; PAID only moves to REFUNDED. */
public enum TransactionStatus {
    PENDING, PAID, FAILED, REFUNDED;

    public boolean canMoveTo(TransactionStatus next) {
        return switch (this) {
            case PENDING -> Set.of(PAID, FAILED).contains(next);
            case PAID -> next == REFUNDED;
            case FAILED, REFUNDED -> false;
        };
    }
}
