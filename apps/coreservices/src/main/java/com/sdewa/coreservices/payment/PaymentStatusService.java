package com.sdewa.coreservices.payment;

import com.sdewa.coreservices.common.util.JsonText;
import com.sdewa.coreservices.identity.UserRepository;
import com.sdewa.coreservices.payment.midtrans.MidtransStatus;
import com.sdewa.coreservices.subscription.Subscription;
import com.sdewa.coreservices.subscription.SubscriptionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * Applies a Midtrans Status API response to a transaction: ADR-002 UC-09 steps 3–8. Idempotent —
 * the row is locked ({@code SELECT ... FOR UPDATE}), and a status that did not change, or a change
 * the status machine does not allow, changes nothing.
 */
@Service
public class PaymentStatusService {

    private static final Logger log = LoggerFactory.getLogger(PaymentStatusService.class);
    private static final DateTimeFormatter MIDTRANS_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final ZoneId MIDTRANS_ZONE = ZoneId.of("Asia/Jakarta");

    private final PaymentTransactionRepository transactions;
    private final TransactionStatusHistoryRepository history;
    private final SubscriptionService subscriptions;
    private final UserRepository users;
    private final JsonText json;
    private final Clock clock;

    public PaymentStatusService(PaymentTransactionRepository transactions, TransactionStatusHistoryRepository history,
                                SubscriptionService subscriptions, UserRepository users, JsonText json, Clock clock) {
        this.transactions = transactions;
        this.history = history;
        this.subscriptions = subscriptions;
        this.users = users;
        this.json = json;
        this.clock = clock;
    }

    public enum Outcome { UNKNOWN_ORDER, APPLIED, UNCHANGED, NOT_ALLOWED, AMOUNT_MISMATCH }

    @Transactional
    public Outcome apply(String orderId, MidtransStatus status, StatusSource source) {
        PaymentTransaction t = transactions.findByOrderIdForUpdate(orderId).orElse(null);
        if (t == null) {
            log.warn("Midtrans status for unknown order_id {}", orderId);
            return Outcome.UNKNOWN_ORDER;
        }
        if (status.isNotFound()) {
            log.info("Midtrans has no transaction for {} yet", orderId);
            return Outcome.UNCHANGED;
        }
        TransactionStatus target = status.mappedStatus();
        if (target == null || target == t.getStatus()) {
            return Outcome.UNCHANGED;
        }
        if (!t.getStatus().canMoveTo(target)) {
            log.warn("Ignoring status change {} -> {} for {}", t.getStatus(), target, orderId);
            return Outcome.NOT_ALLOWED;
        }
        Instant now = clock.instant();
        String payload = json.write(status.sanitized());
        TransactionStatus from = t.getStatus();

        if (target == TransactionStatus.PAID) {
            Long gross = status.grossAmountRupiah();
            boolean currencyOk = status.currency() == null || "IDR".equals(status.currency());
            if (gross == null || gross != t.getAmount() || !currencyOk) {
                if (!t.isNeedsReview()) {
                    t.setNeedsReview(true);
                    history.save(TransactionStatusHistory.of(t.getId(), from, from, source,
                            "amount mismatch: expected " + t.getAmount() + ", got " + status.grossAmount()
                                    + (currencyOk ? "" : " " + status.currency()), payload));
                    log.warn("Amount mismatch for {}: expected {}, got {}", orderId, t.getAmount(), status.grossAmount());
                }
                return Outcome.AMOUNT_MISMATCH;
            }
            // Serialise subscription writes per user (ADR-004 rule M4).
            users.findByIdForUpdate(t.getUserId());
            Subscription sub = subscriptions.activateOrExtend(t.getUserId(), t.getProduct(), t.getPlan(), t.getBillingPeriod(), now);
            t.setSubscriptionId(sub.getId());
            t.setPaidAt(parseMidtransTime(status.settlementTime(), now));
            t.setFailureReason(null);
        } else if (target == TransactionStatus.FAILED) {
            t.setFailureReason("Payment " + status.transactionStatus()
                    + (status.statusMessage() != null ? ": " + status.statusMessage() : ""));
        } else if (target == TransactionStatus.REFUNDED && t.getSubscriptionId() != null) {
            subscriptions.cancelForRefund(t.getSubscriptionId(), now);
        }
        t.setStatus(target);
        if (status.paymentType() != null) {
            t.setPaymentMethod(PaymentMethod.fromMidtrans(status.paymentType()));
        }
        if (status.transactionId() != null) {
            t.setGatewayTransactionId(status.transactionId().length() > 64 ? status.transactionId().substring(0, 64) : status.transactionId());
        }
        transactions.flush();
        history.save(TransactionStatusHistory.of(t.getId(), from, target, source, "midtrans: " + status.transactionStatus(), payload));
        log.info("Transaction {} {} -> {} ({})", orderId, from, target, source);
        return Outcome.APPLIED;
    }

    private static Instant parseMidtransTime(String value, Instant fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return LocalDateTime.parse(value.trim(), MIDTRANS_TIME).atZone(MIDTRANS_ZONE).toInstant();
        } catch (RuntimeException e) {
            return fallback;
        }
    }
}
