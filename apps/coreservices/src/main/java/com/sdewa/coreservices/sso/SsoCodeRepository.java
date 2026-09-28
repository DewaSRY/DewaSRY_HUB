package com.sdewa.coreservices.sso;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface SsoCodeRepository extends JpaRepository<SsoCode, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from SsoCode c where c.codeHash = :hash")
    Optional<SsoCode> findByHashForUpdate(@Param("hash") String hash);

    /** On a reused code, the product's other live codes for that user are cancelled (ADR-001 §5.7). */
    @Modifying
    @Query("update SsoCode c set c.cancelledAt = :now where c.userId = :userId and c.productId = :productId "
            + "and c.usedAt is null and c.cancelledAt is null")
    int cancelOpenCodes(@Param("userId") UUID userId, @Param("productId") UUID productId, @Param("now") Instant now);

    @Modifying
    @Query("delete from SsoCode c where c.expiresAt < :before")
    int deleteExpiredBefore(@Param("before") Instant before);
}
