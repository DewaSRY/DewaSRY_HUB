package com.sdewa.coreservices.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductCredentialRepository extends JpaRepository<ProductCredential, UUID> {

    @Query("select c from ProductCredential c join fetch c.product where c.clientId = :clientId and c.revokedAt is null")
    Optional<ProductCredential> findActiveByClientId(@Param("clientId") String clientId);

    List<ProductCredential> findAllByProductIdAndRevokedAtIsNullOrderByCreatedAtAsc(UUID productId);

    long countByProductIdAndRevokedAtIsNull(UUID productId);

    Optional<ProductCredential> findByProductIdAndClientIdAndRevokedAtIsNull(UUID productId, String clientId);

    boolean existsByClientId(String clientId);

    /** Updates {@code last_used_at} at most once per minute to limit writes (ADR-004 §5.2). */
    @Modifying
    @Query(value = "UPDATE product_credentials SET last_used_at = now() WHERE id = :id "
            + "AND (last_used_at IS NULL OR last_used_at < now() - interval '1 minute')", nativeQuery = true)
    int touchLastUsed(@Param("id") UUID id);
}
