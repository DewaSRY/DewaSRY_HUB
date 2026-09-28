package com.sdewa.coreservices.payment.midtrans;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * In-memory Midtrans for local development and tests ({@code hub.midtrans.mode=fake}). Snap calls
 * return a random token and log; the "Status API" answers from a map that is filled by
 * {@link #setStatus} (used by the local {@code /v1/dev/midtrans/simulate} endpoint and by tests).
 */
@Component
@ConditionalOnProperty(prefix = "hub.midtrans", name = "mode", havingValue = "fake", matchIfMissing = true)
public class FakeMidtransGateway implements MidtransGateway {

    private static final Logger log = LoggerFactory.getLogger(FakeMidtransGateway.class);

    private final Map<String, Map<String, Object>> statuses = new ConcurrentHashMap<>();
    private final Map<String, Long> amounts = new ConcurrentHashMap<>();
    private final AtomicBoolean failNextSnap = new AtomicBoolean();
    private final AtomicBoolean failStatus = new AtomicBoolean();

    @Override
    public SnapResult createSnapTransaction(SnapRequest request) {
        if (failNextSnap.getAndSet(false)) {
            throw new MidtransException("Fake Snap failure");
        }
        String token = UUID.randomUUID().toString();
        amounts.put(request.orderId(), request.grossAmount());
        log.info("[fake-midtrans] Snap transaction {} for {} IDR -> token {}", request.orderId(), request.grossAmount(), token);
        return new SnapResult(token, "https://app.sandbox.midtrans.com/snap/v4/redirection/" + token);
    }

    @Override
    public MidtransStatus fetchStatus(String orderId) {
        if (failStatus.get()) {
            throw new MidtransException("Fake Status API failure");
        }
        Map<String, Object> s = statuses.get(orderId);
        if (s == null) {
            return new MidtransStatus(Map.of("status_code", "404", "status_message", "Transaction doesn't exist."));
        }
        return new MidtransStatus(s);
    }

    /** Sets what the fake Status API returns for an order. {@code grossAmount} null = the Snap amount. */
    public Map<String, Object> setStatus(String orderId, String transactionStatus, String fraudStatus, String paymentType,
                                         Long grossAmount) {
        long amount = grossAmount != null ? grossAmount : amounts.getOrDefault(orderId, 0L);
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("order_id", orderId);
        s.put("status_code", switch (transactionStatus) {
            case "settlement", "capture", "refund", "partial_refund" -> "200";
            case "pending" -> "201";
            default -> "202";
        });
        s.put("gross_amount", amount + ".00");
        s.put("currency", "IDR");
        s.put("transaction_status", transactionStatus);
        if (fraudStatus != null) {
            s.put("fraud_status", fraudStatus);
        }
        s.put("payment_type", paymentType == null ? "qris" : paymentType);
        s.put("transaction_id", "fake-" + orderId);
        s.put("status_message", "Fake " + transactionStatus);
        statuses.put(orderId, s);
        return s;
    }

    public void failNextSnap() {
        failNextSnap.set(true);
    }

    public void setFailStatus(boolean fail) {
        failStatus.set(fail);
    }

    public void reset() {
        statuses.clear();
        amounts.clear();
        failNextSnap.set(false);
        failStatus.set(false);
    }
}
