package com.sdewa.coreservices.payment;

import com.sdewa.coreservices.common.api.Money;
import com.sdewa.coreservices.product.BillingPeriod;
import com.sdewa.coreservices.subscription.SubscriptionDtos.ProductRef;
import com.sdewa.coreservices.subscription.SubscriptionDtos.SubscriptionView;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Billing shapes (ADR-003 §7.1, §10.2). */
public final class PaymentDtos {

    private PaymentDtos() {
    }

    public record CheckoutRequest(@NotNull UUID planId) {
    }

    public record TransactionPlan(UUID id, String code, String name, BillingPeriod billingPeriod) {
    }

    public record Snap(String token, String redirectUrl, Instant expiresAt) {
    }

    public record TransactionView(String orderId, TransactionStatus status, ProductRef product, TransactionPlan plan,
                                  Money price, PaymentMethod paymentMethod, Snap snap, String failureReason,
                                  UUID subscriptionId, Instant createdAt, Instant paidAt) {
    }

    public record UserRef(UUID id, String email, String name) {
    }

    public record AdminTransactionView(String orderId, TransactionStatus status, ProductRef product, TransactionPlan plan,
                                       Money price, PaymentMethod paymentMethod, String failureReason, UUID subscriptionId,
                                       Instant createdAt, Instant paidAt, UserRef user, String gatewayTransactionId,
                                       boolean needsReview) {
    }

    public record StatusHistoryItem(TransactionStatus status, TransactionStatus fromStatus, StatusSource source,
                                    Instant at, String note) {
    }

    public record AdminTransactionDetail(String orderId, TransactionStatus status, ProductRef product, TransactionPlan plan,
                                         Money price, PaymentMethod paymentMethod, String failureReason, UUID subscriptionId,
                                         Instant createdAt, Instant paidAt, UserRef user, String gatewayTransactionId,
                                         boolean needsReview, List<StatusHistoryItem> statusHistory,
                                         SubscriptionView subscription, Boolean changed) {
    }

    public record TransactionSummary(long count, long paidCount, Money paidAmount) {
    }
}
