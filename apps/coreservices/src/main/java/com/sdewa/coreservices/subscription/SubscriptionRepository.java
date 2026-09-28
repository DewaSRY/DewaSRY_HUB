package com.sdewa.coreservices.subscription;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    @Query("select s from Subscription s join fetch s.plan join fetch s.product where s.userId = :userId and s.product.id = :productId")
    Optional<Subscription> findByUserAndProduct(@Param("userId") UUID userId, @Param("productId") UUID productId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Subscription s where s.userId = :userId and s.product.id = :productId")
    Optional<Subscription> findByUserAndProductForUpdate(@Param("userId") UUID userId, @Param("productId") UUID productId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Subscription s where s.id = :id")
    Optional<Subscription> findByIdForUpdate(@Param("id") UUID id);

    @Query("select s from Subscription s join fetch s.plan join fetch s.product where s.userId = :userId")
    List<Subscription> findAllForUser(@Param("userId") UUID userId);

    @Query("select s from Subscription s join fetch s.plan join fetch s.product where s.id = :id")
    Optional<Subscription> findWithDetails(@Param("id") UUID id);

    /** UC-13: only rows still ACTIVE are touched, so running twice changes nothing. */
    @Modifying
    @Query("update Subscription s set s.status = com.sdewa.coreservices.subscription.SubscriptionStatus.EXPIRED, s.updatedAt = :now "
            + "where s.status = com.sdewa.coreservices.subscription.SubscriptionStatus.ACTIVE and s.endDate <= :now")
    int expireDue(@Param("now") Instant now);
}
