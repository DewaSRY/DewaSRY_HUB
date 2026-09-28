package com.sdewa.coreservices.payment;

import com.sdewa.coreservices.product.BillingPeriod;
import com.sdewa.coreservices.product.Plan;
import com.sdewa.coreservices.product.Product;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/** One payment attempt (table {@code transactions}). Amount and period are copied from the plan at checkout. */
@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
public class PaymentTransaction {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(name = "order_id", nullable = false, updatable = false, length = 40)
    private String orderId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false, updatable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false, updatable = false)
    private Plan plan;

    @Column(name = "subscription_id")
    private UUID subscriptionId;

    @Column(nullable = false, updatable = false)
    private long amount;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, length = 3, updatable = false)
    private String currency = "IDR";

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_period", nullable = false, length = 16, updatable = false)
    private BillingPeriod billingPeriod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private TransactionStatus status = TransactionStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 32)
    private PaymentMethod paymentMethod;

    @Column(name = "gateway_transaction_id", length = 64)
    private String gatewayTransactionId;

    @Column(name = "snap_token", length = 64)
    private String snapToken;

    @Column(name = "snap_redirect_url", columnDefinition = "text")
    private String snapRedirectUrl;

    @Column(name = "snap_expires_at")
    private Instant snapExpiresAt;

    @Column(name = "failure_reason", columnDefinition = "text")
    private String failureReason;

    @Column(name = "needs_review", nullable = false)
    private boolean needsReview;

    @Column(name = "idempotency_key", updatable = false)
    private UUID idempotencyKey;

    @Column(name = "paid_at")
    private Instant paidAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public boolean hasUsableSnap(Instant now) {
        return status == TransactionStatus.PENDING && snapToken != null && snapExpiresAt != null && now.isBefore(snapExpiresAt);
    }
}
