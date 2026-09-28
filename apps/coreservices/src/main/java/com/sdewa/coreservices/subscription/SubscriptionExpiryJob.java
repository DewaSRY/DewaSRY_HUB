package com.sdewa.coreservices.subscription;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** UC-13: every hour, ACTIVE subscriptions past their end date become EXPIRED. ShedLock keeps it to one instance. */
@Component
@ConditionalOnProperty(prefix = "hub.jobs", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SubscriptionExpiryJob {

    private final SubscriptionService subscriptions;

    public SubscriptionExpiryJob(SubscriptionService subscriptions) {
        this.subscriptions = subscriptions;
    }

    @Scheduled(cron = "0 0 * * * *", zone = "UTC")
    @SchedulerLock(name = "expireSubscriptions", lockAtMostFor = "PT10M", lockAtLeastFor = "PT1M")
    public void run() {
        subscriptions.expireDue();
    }
}
