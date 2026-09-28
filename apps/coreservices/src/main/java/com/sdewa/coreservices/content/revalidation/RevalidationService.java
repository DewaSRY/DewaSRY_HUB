package com.sdewa.coreservices.content.revalidation;

import com.sdewa.coreservices.config.HubProperties;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Sends revalidation after the database commit (callers invoke it outside their transaction). The
 * first attempt is synchronous; if it fails the admin sees {@code PENDING_RETRY} while the call is
 * retried in the background after 1 s, 5 s and 30 s (ADR-003 §11.1). ISR time-based revalidation
 * is the final fallback.
 */
@Service
public class RevalidationService {

    private static final Logger log = LoggerFactory.getLogger(RevalidationService.class);

    private final RevalidationClient client;
    private final List<Duration> retryDelays;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "revalidate-retry");
        t.setDaemon(true);
        return t;
    });

    public RevalidationService(RevalidationClient client, HubProperties properties) {
        this.client = client;
        this.retryDelays = List.copyOf(properties.getRevalidate().getRetryDelays());
    }

    public RevalidationResult revalidate(List<String> rawPaths) {
        List<String> paths = new ArrayList<>(new LinkedHashSet<>(rawPaths));
        if (paths.isEmpty()) {
            return new RevalidationResult(RevalidationResult.OK, paths);
        }
        if (!client.enabled()) {
            log.info("Revalidation disabled (no hub.revalidate.url); would revalidate {}", paths);
            return new RevalidationResult(RevalidationResult.OK, paths);
        }
        if (client.revalidate(paths)) {
            return new RevalidationResult(RevalidationResult.OK, paths);
        }
        scheduleRetry(paths, 0);
        return new RevalidationResult(RevalidationResult.PENDING_RETRY, paths);
    }

    private void scheduleRetry(List<String> paths, int attempt) {
        if (attempt >= retryDelays.size()) {
            log.warn("Revalidation gave up after {} retries for {}", retryDelays.size(), paths);
            return;
        }
        scheduler.schedule(() -> {
            if (client.revalidate(paths)) {
                log.info("Revalidation succeeded on retry {} for {}", attempt + 1, paths);
            } else {
                scheduleRetry(paths, attempt + 1);
            }
        }, retryDelays.get(attempt).toMillis(), TimeUnit.MILLISECONDS);
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
    }
}
