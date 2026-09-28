package com.sdewa.coreservices.subscription;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.util.JsonText;
import com.sdewa.coreservices.product.Plan;
import com.sdewa.coreservices.product.PlanRepository;
import com.sdewa.coreservices.product.Product;
import com.sdewa.coreservices.product.ProductRepository;
import com.sdewa.coreservices.subscription.SubscriptionDtos.Entitlement;
import com.sdewa.coreservices.subscription.SubscriptionDtos.EntitlementPlan;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

/**
 * Entitlement (UC-07, ADR-003 §8.4): computed on read from {@code status = ACTIVE and now < end_date},
 * so a late expiry job never gives free access (rule S1).
 */
@Service
@Transactional(readOnly = true)
public class EntitlementService {

    private final SubscriptionRepository subscriptions;
    private final PlanRepository plans;
    private final ProductRepository products;
    private final JsonText json;
    private final Clock clock;

    public EntitlementService(SubscriptionRepository subscriptions, PlanRepository plans, ProductRepository products,
                              JsonText json, Clock clock) {
        this.subscriptions = subscriptions;
        this.plans = plans;
        this.products = products;
        this.json = json;
        this.clock = clock;
    }

    public Entitlement forUser(UUID userId, UUID productId) {
        Product product = products.findById(productId).orElseThrow(ApiException::notFound);
        Instant now = clock.instant();
        Subscription sub = subscriptions.findByUserAndProduct(userId, productId).orElse(null);
        if (sub != null && sub.isEntitled(now)) {
            Plan p = sub.getPlan();
            return new Entitlement(product.getCode(), userId, true, sub.getStatus(),
                    new EntitlementPlan(p.getCode(), p.getName(), p.getBillingPeriod()), sub.getEndDate(),
                    json.parse(p.getFeatures()), now);
        }
        Plan free = plans.findFreePlan(productId).orElse(null);
        return new Entitlement(product.getCode(), userId, false,
                sub == null ? null : sub.getStatus(),
                free == null ? null : new EntitlementPlan(free.getCode(), free.getName(), free.getBillingPeriod()),
                sub == null ? null : sub.getEndDate(),
                free == null ? null : json.parse(free.getFeatures()), now);
    }
}
