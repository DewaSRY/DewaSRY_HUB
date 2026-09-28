package com.sdewa.coreservices.payment;

import com.sdewa.coreservices.common.api.Money;
import com.sdewa.coreservices.payment.PaymentDtos.AdminTransactionDetail;
import com.sdewa.coreservices.payment.PaymentDtos.AdminTransactionView;
import com.sdewa.coreservices.payment.PaymentDtos.Snap;
import com.sdewa.coreservices.payment.PaymentDtos.StatusHistoryItem;
import com.sdewa.coreservices.payment.PaymentDtos.TransactionPlan;
import com.sdewa.coreservices.payment.PaymentDtos.TransactionView;
import com.sdewa.coreservices.payment.PaymentDtos.UserRef;
import com.sdewa.coreservices.subscription.SubscriptionDtos.ProductRef;
import com.sdewa.coreservices.subscription.SubscriptionDtos.SubscriptionView;

import java.time.Instant;
import java.util.List;

final class TransactionMapper {

    private TransactionMapper() {
    }

    static TransactionView toView(PaymentTransaction t, Instant now) {
        Snap snap = t.hasUsableSnap(now) ? new Snap(t.getSnapToken(), t.getSnapRedirectUrl(), t.getSnapExpiresAt()) : null;
        return new TransactionView(t.getOrderId(), t.getStatus(), product(t), plan(t), Money.idr(t.getAmount()),
                t.getPaymentMethod(), snap, t.getFailureReason(), t.getSubscriptionId(), t.getCreatedAt(), t.getPaidAt());
    }

    static AdminTransactionView toAdmin(PaymentTransaction t, UserRef user) {
        return new AdminTransactionView(t.getOrderId(), t.getStatus(), product(t), plan(t), Money.idr(t.getAmount()),
                t.getPaymentMethod(), t.getFailureReason(), t.getSubscriptionId(), t.getCreatedAt(), t.getPaidAt(), user,
                t.getGatewayTransactionId(), t.isNeedsReview());
    }

    static AdminTransactionDetail toDetail(PaymentTransaction t, UserRef user, List<TransactionStatusHistory> history,
                                           SubscriptionView subscription, Boolean changed) {
        List<StatusHistoryItem> items = history.stream()
                .map(h -> new StatusHistoryItem(h.getToStatus(), h.getFromStatus(), h.getSource(), h.getCreatedAt(), h.getNote()))
                .toList();
        return new AdminTransactionDetail(t.getOrderId(), t.getStatus(), product(t), plan(t), Money.idr(t.getAmount()),
                t.getPaymentMethod(), t.getFailureReason(), t.getSubscriptionId(), t.getCreatedAt(), t.getPaidAt(), user,
                t.getGatewayTransactionId(), t.isNeedsReview(), items, subscription, changed);
    }

    private static ProductRef product(PaymentTransaction t) {
        return new ProductRef(t.getProduct().getCode(), t.getProduct().getName());
    }

    private static TransactionPlan plan(PaymentTransaction t) {
        return new TransactionPlan(t.getPlan().getId(), t.getPlan().getCode(), t.getPlan().getName(), t.getBillingPeriod());
    }
}
