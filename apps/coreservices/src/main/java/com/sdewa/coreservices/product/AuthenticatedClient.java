package com.sdewa.coreservices.product;

import java.util.UUID;

/** A product client whose credential was verified. */
public record AuthenticatedClient(UUID credentialId, String clientId, UUID productId, String productCode, boolean productActive) {
}
