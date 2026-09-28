package com.sdewa.coreservices.payment.midtrans;

/** The Midtrans calls the hub makes (ADR-003 §11.2). */
public interface MidtransGateway {

    /** {@code POST /snap/v1/transactions}. Throws {@link MidtransException} on any failure. */
    SnapResult createSnapTransaction(SnapRequest request);

    /** {@code GET /v2/{order_id}/status}. Throws {@link MidtransException} on transport or 5xx errors. */
    MidtransStatus fetchStatus(String orderId);

    record SnapRequest(String orderId, long grossAmount, String itemId, String itemName, String customerEmail,
                       String customerName, int expiryMinutes) {
    }

    record SnapResult(String token, String redirectUrl) {
    }
}
