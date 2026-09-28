package com.sdewa.coreservices.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlanRepository extends JpaRepository<Plan, UUID> {

    boolean existsByCode(String code);

    List<Plan> findAllByProductIdOrderByPriceAmountAscCreatedAtAsc(UUID productId);

    @Query("select pl from Plan pl where pl.product.id in :productIds and pl.active = true and pl.isPublic = true order by pl.priceAmount asc, pl.createdAt asc")
    List<Plan> findPublicActiveByProductIds(@Param("productIds") Collection<UUID> productIds);

    /** The product's free plan used as the entitlement fallback (ADR-003 rule N2). */
    @Query("select pl from Plan pl where pl.product.id = :productId and pl.priceAmount = 0 and pl.active = true and pl.isPublic = true")
    Optional<Plan> findFreePlan(@Param("productId") UUID productId);

    @Query("select pl from Plan pl join fetch pl.product where pl.id = :id")
    Optional<Plan> findWithProduct(@Param("id") UUID id);
}
