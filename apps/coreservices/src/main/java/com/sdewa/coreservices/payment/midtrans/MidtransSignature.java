package com.sdewa.coreservices.payment.midtrans;

import com.sdewa.coreservices.common.util.Hashing;

/** {@code signature_key = SHA512(order_id + status_code + gross_amount + server_key)} (ADR-002 UC-09 step 1). */
public final class MidtransSignature {

    private MidtransSignature() {
    }

    public static String compute(String orderId, String statusCode, String grossAmount, String serverKey) {
        return Hashing.sha512Hex(orderId + statusCode + grossAmount + serverKey);
    }

    public static boolean verify(String orderId, String statusCode, String grossAmount, String signature, String serverKey) {
        if (orderId == null || statusCode == null || grossAmount == null || signature == null
                || serverKey == null || serverKey.isEmpty()) {
            return false;
        }
        return Hashing.constantTimeEquals(compute(orderId, statusCode, grossAmount, serverKey), signature.toLowerCase());
    }
}
