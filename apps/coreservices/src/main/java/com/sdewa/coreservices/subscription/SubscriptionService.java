package com.sdewa.coreservices.subscription;

import com.sdewa.coreservices.common.api.Money;
import com.sdewa.coreservices.product.BillingPeriod;
import com.sdewa.coreservices.product.Plan;
import com.sdewa.coreservices.product.Product;
import com.sdewa.coreservices.subscription.SubscriptionDtos.ProductRef;
import com.sdewa.coreservices.subscription.SubscriptionDtos.SubscriptionPlan;
import com.sdewa.coreservices.subscription.SubscriptionDtos.SubscriptionView;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Subscription writes happen only from the payment status path (ADR-004 rule M3): create/extend on
 * {@code PAID}, cancel on {@code REFUNDED}; plus the hourly expiry job (UC-13).
 */
@Service
public class SubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionService.class);

    private final SubscriptionRepository subscriptions;
    private final Clock clock;

    public SubscriptionService(SubscriptionRepository subscriptions, Clock clock) {
        this.subscriptions = subscriptions;
        this.clock = clock;
    }

    /**
     * UC-09 step 6. Must run inside the caller's transaction, which already locks the user row, so
     * two payments for the same user and product cannot race on creating the row.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Subscription activateOrExtend(UUID userId, Product product, Plan plan, BillingPeriod period, Instant now) {
        Subscription sub = subscriptions.findByUserAndProductForUpdate(userId, product.getId()).orElse(null);
        if (sub == null) {
            sub = new Subscription();
            sub.setUserId(userId);
            sub.setProduct(product);
            sub.setPlan(plan);
            sub.setStatus(SubscriptionStatus.ACTIVE);
            sub.setStartDate(now);
            sub.setEndDate(period.addTo(now));
            return subscriptions.saveAndFlush(sub);
        }
        Instant base = sub.getEndDate().isAfter(now) ? sub.getEndDate() : now;
        sub.setEndDate(period.addTo(base));
        sub.setStatus(SubscriptionStatus.ACTIVE);
        sub.setPlan(plan);
        return subscriptions.saveAndFlush(sub);
    }

    /** UC-09 step 7: a refunded payment ends access now. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void cancelForRefund(UUID subscriptionId, Instant now) {
        subscriptions.findByIdForUpdate(subscriptionId).ifPresent(sub -> {
            sub.setStatus(SubscriptionStatus.CANCELLED);
            sub.setEndDate(now.isBefore(sub.getStartDate()) ? sub.getStartDate() : now);
            subscriptions.saveAndFlush(sub);
        });
    }

    /** UC-13. */
    @Transactional
    public int expireDue() {
        int n = subscriptions.expireDue(clock.instant());
        if (n > 0) {
            log.info("Expired {} subscription(s)", n);
        }
        return n;
    }

    /** UC-10: one row per product, entitled first. */
    @Transactional(readOnly = true)
    public List<SubscriptionView> listForUser(UUID userId) {
        Instant now = clock.instant();
        return subscriptions.findAllForUser(userId).stream()
                .map(s -> toView(s, now))
                .sorted(Comparator.comparing(SubscriptionView::entitled).reversed()
                        .thenComparing(SubscriptionView::endDate, Comparator.reverseOrder()))
                .toList();
    }

    @Transactional(readOnly = true)
    public SubscriptionView view(UUID subscriptionId) {
        return subscriptions.findWithDetails(subscriptionId).map(s -> toView(s, clock.instant())).orElse(null);
    }

    public static SubscriptionView toView(Subscription s, Instant now) {
        Plan p = s.getPlan();
        return new SubscriptionView(s.getId(), new ProductRef(s.getProduct().getCode(), s.getProduct().getName()),
                new SubscriptionPlan(p.getId(), p.getCode(), p.getName(), p.getBillingPeriod(), Money.idr(p.getPriceAmount()), p.isActive()),
                s.getStatus(), s.getStartDate(), s.getEndDate(), s.isEntitled(now));
    }
}
