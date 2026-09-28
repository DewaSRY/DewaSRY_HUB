package com.sdewa.coreservices.subscription;

import com.sdewa.coreservices.common.api.Money;
import com.sdewa.coreservices.product.BillingPeriod;
import tools.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

/** Subscription and entitlement shapes (ADR-003 §7.1, §8.4). */
public final class SubscriptionDtos {

    private SubscriptionDtos() {
    }

    public record ProductRef(String code, String name) {
    }

    public record SubscriptionPlan(UUID id, String code, String name, BillingPeriod billingPeriod, Money price, boolean active) {
    }

    public record SubscriptionView(UUID id, ProductRef product, SubscriptionPlan plan, SubscriptionStatus status,
                                   Instant startDate, Instant endDate, boolean entitled) {
    }

    public record EntitlementPlan(String code, String name, BillingPeriod billingPeriod) {
    }

    public record Entitlement(String productCode, UUID userId, boolean entitled, SubscriptionStatus status,
                              EntitlementPlan plan, Instant endDate, JsonNode features, Instant checkedAt) {
    }
}
