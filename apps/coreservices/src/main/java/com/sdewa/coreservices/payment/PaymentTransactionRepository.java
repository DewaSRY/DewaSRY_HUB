package com.sdewa.coreservices.payment;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID>,
        JpaSpecificationExecutor<PaymentTransaction> {

    @EntityGraph(attributePaths = {"product", "plan"})
    Optional<PaymentTransaction> findByOrderId(String orderId);

    @EntityGraph(attributePaths = {"product", "plan"})
    Optional<PaymentTransaction> findByOrderIdAndUserId(String orderId, UUID userId);

    /** UC-09 step 3: {@code SELECT ... FOR UPDATE} on the transaction row. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from PaymentTransaction t where t.orderId = :orderId")
    Optional<PaymentTransaction> findByOrderIdForUpdate(@Param("orderId") String orderId);

    @EntityGraph(attributePaths = {"product", "plan"})
    Optional<PaymentTransaction> findByUserIdAndIdempotencyKey(UUID userId, UUID idempotencyKey);

    @EntityGraph(attributePaths = {"product", "plan"})
    @Query("select t from PaymentTransaction t where t.userId = :userId and t.plan.id = :planId "
            + "and t.status = com.sdewa.coreservices.payment.TransactionStatus.PENDING "
            + "and t.snapToken is not null and t.snapExpiresAt > :now order by t.createdAt desc")
    List<PaymentTransaction> findReusablePending(@Param("userId") UUID userId, @Param("planId") UUID planId, @Param("now") Instant now);

    @EntityGraph(attributePaths = {"product", "plan"})
    Page<PaymentTransaction> findAllByUserId(UUID userId, Pageable pageable);

    @EntityGraph(attributePaths = {"product", "plan"})
    Page<PaymentTransaction> findAllByUserIdAndStatus(UUID userId, TransactionStatus status, Pageable pageable);

    boolean existsByOrderId(String orderId);
}
