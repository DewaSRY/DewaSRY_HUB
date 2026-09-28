package com.sdewa.coreservices.payment;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.config.HubProperties;
import com.sdewa.coreservices.identity.User;
import com.sdewa.coreservices.identity.UserRepository;
import com.sdewa.coreservices.payment.PaymentDtos.TransactionView;
import com.sdewa.coreservices.payment.midtrans.MidtransGateway;
import com.sdewa.coreservices.payment.midtrans.MidtransGateway.SnapRequest;
import com.sdewa.coreservices.payment.midtrans.MidtransGateway.SnapResult;
import com.sdewa.coreservices.product.Plan;
import com.sdewa.coreservices.product.PlanRepository;
import com.sdewa.coreservices.subscription.Subscription;
import com.sdewa.coreservices.subscription.SubscriptionRepository;
import com.sdewa.coreservices.common.util.Hashing;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * {@code POST /checkout} (UC-08, UC-12, ADR-003 §7.2). The transaction is committed as PENDING
 * before Midtrans is called; the Snap token is stored in a second short transaction. A Midtrans
 * failure marks the transaction FAILED and answers 502.
 */
@Service
public class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);
    private static final DateTimeFormatter ORDER_DATE = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);

    private final PaymentTransactionRepository transactions;
    private final TransactionStatusHistoryRepository history;
    private final PlanRepository plans;
    private final SubscriptionRepository subscriptions;
    private final UserRepository users;
    private final MidtransGateway gateway;
    private final TransactionTemplate tx;
    private final HubProperties properties;
    private final Clock clock;

    public CheckoutService(PaymentTransactionRepository transactions, TransactionStatusHistoryRepository history,
                           PlanRepository plans, SubscriptionRepository subscriptions, UserRepository users,
                           MidtransGateway gateway, TransactionTemplate tx, HubProperties properties, Clock clock) {
        this.transactions = transactions;
        this.history = history;
        this.plans = plans;
        this.subscriptions = subscriptions;
        this.users = users;
        this.gateway = gateway;
        this.tx = tx;
        this.properties = properties;
        this.clock = clock;
    }

    /** @param created true → 201 (new transaction), false → 200 (reused / idempotent repeat) */
    public record CheckoutResult(boolean created, TransactionView transaction) {
    }

    private record Prepared(PaymentTransaction existing, UUID newTransactionId, String orderId, long amount,
                            String itemId, String itemName, String email, String name) {
    }

    public CheckoutResult checkout(UUID userId, UUID planId, String idempotencyKeyHeader) {
        UUID idempotencyKey = parseIdempotencyKey(idempotencyKeyHeader);
        Prepared prepared;
        try {
            prepared = tx.execute(s -> prepare(userId, planId, idempotencyKey));
        } catch (DataIntegrityViolationException race) {
            // Same Idempotency-Key raced with another request: return the first one.
            if (idempotencyKey != null) {
                return transactions.findByUserIdAndIdempotencyKey(userId, idempotencyKey)
                        .map(t -> new CheckoutResult(false, TransactionMapper.toView(t, clock.instant())))
                        .orElseThrow(() -> race);
            }
            throw race;
        }
        if (prepared.existing() != null) {
            return new CheckoutResult(false, TransactionMapper.toView(prepared.existing(), clock.instant()));
        }
        int expiry = properties.getMidtrans().getSnapExpiryMinutes();
        SnapResult snap;
        try {
            snap = gateway.createSnapTransaction(new SnapRequest(prepared.orderId(), prepared.amount(), prepared.itemId(),
                    prepared.itemName(), prepared.email(), prepared.name(), expiry));
        } catch (RuntimeException e) {
            log.warn("Snap failed for {}: {}", prepared.orderId(), e.getMessage());
            tx.executeWithoutResult(s -> markStartFailed(prepared.newTransactionId()));
            throw new ApiException(ErrorReason.UPSTREAM_ERROR,
                    "Payment could not be started, please try again (order " + prepared.orderId() + ")");
        }
        TransactionView view = tx.execute(s -> {
            PaymentTransaction t = transactions.findById(prepared.newTransactionId()).orElseThrow();
            t.setSnapToken(snap.token());
            t.setSnapRedirectUrl(snap.redirectUrl());
            t.setSnapExpiresAt(clock.instant().plusSeconds(expiry * 60L));
            transactions.flush();
            t.getProduct().getName();
            t.getPlan().getName();
            return TransactionMapper.toView(t, clock.instant());
        });
        return new CheckoutResult(true, view);
    }

    private Prepared prepare(UUID userId, UUID planId, UUID idempotencyKey) {
        // Lock the user row: one checkout per user at a time, so "reuse pending" cannot race.
        User user = users.findByIdForUpdate(userId).orElseThrow(ApiException::notFound);
        Instant now = clock.instant();
        if (idempotencyKey != null) {
            var repeat = transactions.findByUserIdAndIdempotencyKey(userId, idempotencyKey);
            if (repeat.isPresent()) {
                return existing(repeat.get());
            }
        }
        Plan plan = plans.findWithProduct(planId).orElseThrow(ApiException::notFound);
        if (!plan.isActive() || !plan.getProduct().isActive() || plan.getPriceAmount() <= 0 || plan.getBillingPeriod() == null) {
            throw new ApiException(ErrorReason.PLAN_NOT_PURCHASABLE);
        }
        Subscription current = subscriptions.findByUserAndProduct(userId, plan.getProduct().getId()).orElse(null);
        if (current != null && current.isEntitled(now) && !current.getPlan().getId().equals(plan.getId())) {
            throw new ApiException(ErrorReason.PLAN_CHANGE_NOT_SUPPORTED);
        }
        List<PaymentTransaction> reusable = transactions.findReusablePending(userId, planId, now);
        if (!reusable.isEmpty()) {
            return existing(reusable.getFirst());
        }
        PaymentTransaction t = new PaymentTransaction();
        t.setOrderId(newOrderId(now));
        t.setUserId(userId);
        t.setProduct(plan.getProduct());
        t.setPlan(plan);
        t.setAmount(plan.getPriceAmount());
        t.setCurrency("IDR");
        t.setBillingPeriod(plan.getBillingPeriod());
        t.setStatus(TransactionStatus.PENDING);
        t.setIdempotencyKey(idempotencyKey);
        transactions.saveAndFlush(t);
        history.save(TransactionStatusHistory.of(t.getId(), null, TransactionStatus.PENDING, StatusSource.CHECKOUT, null, null));
        return new Prepared(null, t.getId(), t.getOrderId(), t.getAmount(), plan.getCode(),
                plan.getProduct().getName() + " " + plan.getName(), user.getEmail(), user.getName());
    }

    private Prepared existing(PaymentTransaction t) {
        t.getProduct().getName();
        t.getPlan().getName();
        return new Prepared(t, null, null, 0, null, null, null, null);
    }

    private void markStartFailed(UUID transactionId) {
        PaymentTransaction t = transactions.findById(transactionId).orElseThrow();
        if (t.getStatus() != TransactionStatus.PENDING) {
            return;
        }
        t.setStatus(TransactionStatus.FAILED);
        t.setFailureReason("Payment could not be started, please try again");
        history.save(TransactionStatusHistory.of(t.getId(), TransactionStatus.PENDING, TransactionStatus.FAILED,
                StatusSource.CHECKOUT, "Midtrans Snap call failed", null));
    }

    private String newOrderId(Instant now) {
        String orderId;
        do {
            orderId = "DSH-" + ORDER_DATE.format(now) + "-" + Hashing.randomBase32(6);
        } while (transactions.existsByOrderId(orderId));
        return orderId;
    }

    private static UUID parseIdempotencyKey(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(header.trim());
        } catch (IllegalArgumentException e) {
            throw ApiException.validation("Idempotency-Key", "Must be a UUID.");
        }
    }
}
