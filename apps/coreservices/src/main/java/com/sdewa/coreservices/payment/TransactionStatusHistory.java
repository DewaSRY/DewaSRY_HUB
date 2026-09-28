package com.sdewa.coreservices.payment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "transaction_status_history")
@Getter
@Setter
@NoArgsConstructor
public class TransactionStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_id", nullable = false, updatable = false)
    private UUID transactionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 16, updatable = false)
    private TransactionStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 16, updatable = false)
    private TransactionStatus toStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16, updatable = false)
    private StatusSource source;

    @Column(columnDefinition = "text", updatable = false)
    private String note;

    /** Midtrans Status API response, without signature or keys (jsonb). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "gateway_payload", updatable = false)
    private String gatewayPayload;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public static TransactionStatusHistory of(UUID transactionId, TransactionStatus from, TransactionStatus to,
                                              StatusSource source, String note, String payload) {
        TransactionStatusHistory h = new TransactionStatusHistory();
        h.setTransactionId(transactionId);
        h.setFromStatus(from);
        h.setToStatus(to);
        h.setSource(source);
        h.setNote(note);
        h.setGatewayPayload(payload);
        return h;
    }
}
