package com.sdewa.coreservices.payment;

import java.util.Locale;

public enum PaymentMethod {
    QRIS, BANK_TRANSFER, GOPAY, SHOPEEPAY, CREDIT_CARD, OTHER;

    /** Maps Midtrans {@code payment_type}. */
    public static PaymentMethod fromMidtrans(String paymentType) {
        if (paymentType == null || paymentType.isBlank()) {
            return null;
        }
        return switch (paymentType.toLowerCase(Locale.ROOT)) {
            case "qris" -> QRIS;
            case "bank_transfer", "echannel", "permata", "bca_klikpay", "bri_epay", "cimb_clicks", "danamon_online" -> BANK_TRANSFER;
            case "gopay" -> GOPAY;
            case "shopeepay" -> SHOPEEPAY;
            case "credit_card" -> CREDIT_CARD;
            default -> OTHER;
        };
    }
}
