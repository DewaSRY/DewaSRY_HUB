package com.sdewa.coreservices.payment.midtrans;

import com.sdewa.coreservices.payment.TransactionStatus;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/** A Midtrans Status API response (the source of truth, ADR-002 UC-09 step 2). */
public record MidtransStatus(Map<String, Object> raw) {

    public MidtransStatus {
        raw = raw == null ? Map.of() : Map.copyOf(withoutNulls(raw));
    }

    private static Map<String, Object> withoutNulls(Map<String, Object> in) {
        Map<String, Object> out = new LinkedHashMap<>();
        in.forEach((k, v) -> {
            if (k != null && v != null) {
                out.put(k, v);
            }
        });
        return out;
    }

    public String get(String key) {
        Object v = raw.get(key);
        return v == null ? null : String.valueOf(v);
    }

    public String statusCode() {
        return get("status_code");
    }

    public String transactionStatus() {
        return get("transaction_status");
    }

    public String fraudStatus() {
        return get("fraud_status");
    }

    public String grossAmount() {
        return get("gross_amount");
    }

    public String paymentType() {
        return get("payment_type");
    }

    public String transactionId() {
        return get("transaction_id");
    }

    public String currency() {
        return get("currency");
    }

    public String settlementTime() {
        return get("settlement_time");
    }

    public String statusMessage() {
        return get("status_message");
    }

    /** Midtrans answers an unknown order with {@code status_code = 404} in the body. */
    public boolean isNotFound() {
        return "404".equals(statusCode());
    }

    /**
     * ADR-002 §6.1 mapping. Returns {@code null} for statuses that do not move our state (for example
     * {@code capture} with {@code fraud_status = challenge}).
     */
    public TransactionStatus mappedStatus() {
        String s = transactionStatus();
        if (s == null) {
            return null;
        }
        return switch (s) {
            case "pending" -> TransactionStatus.PENDING;
            case "settlement" -> TransactionStatus.PAID;
            case "capture" -> "accept".equals(fraudStatus()) ? TransactionStatus.PAID : null;
            case "deny", "cancel", "expire", "failure" -> TransactionStatus.FAILED;
            case "refund", "partial_refund" -> TransactionStatus.REFUNDED;
            default -> null;
        };
    }

    /**
     * {@code gross_amount} ("49000.00") as whole rupiah (ADR-004 rule M7); {@code null} when it is
     * missing, unparsable, or has a non-zero fraction.
     */
    public Long grossAmountRupiah() {
        String g = grossAmount();
        if (g == null) {
            return null;
        }
        try {
            BigDecimal d = new BigDecimal(g.trim());
            return d.stripTrailingZeros().scale() <= 0 ? d.longValueExact() : null;
        } catch (ArithmeticException | NumberFormatException e) {
            return null;
        }
    }

    /** Payload safe to store: no signature. */
    public Map<String, Object> sanitized() {
        Map<String, Object> copy = new LinkedHashMap<>(raw);
        copy.remove("signature_key");
        return copy;
    }
}
