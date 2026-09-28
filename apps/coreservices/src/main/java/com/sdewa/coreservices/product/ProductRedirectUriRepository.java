package com.sdewa.coreservices.product;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductRedirectUriRepository extends JpaRepository<ProductRedirectUri, UUID> {

    boolean existsByProductIdAndUri(UUID productId, String uri);

    List<ProductRedirectUri> findAllByProductIdOrderByCreatedAtAsc(UUID productId);
}
