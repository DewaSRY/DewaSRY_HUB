package com.sdewa.coreservices.sso;

import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;

/** Removes SSO codes that expired more than a day ago. */
@Component
@ConditionalOnProperty(prefix = "hub.jobs", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SsoCodeCleanupJob {

    private final SsoCodeRepository codes;
    private final Clock clock;

    public SsoCodeCleanupJob(SsoCodeRepository codes, Clock clock) {
        this.codes = codes;
        this.clock = clock;
    }

    @Scheduled(cron = "0 30 * * * *", zone = "UTC")
    @SchedulerLock(name = "cleanupSsoCodes", lockAtMostFor = "PT10M", lockAtLeastFor = "PT1M")
    @Transactional
    public void run() {
        codes.deleteExpiredBefore(clock.instant().minus(Duration.ofDays(1)));
    }
}
