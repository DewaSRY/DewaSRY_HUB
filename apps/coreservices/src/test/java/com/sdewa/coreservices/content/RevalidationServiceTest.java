package com.sdewa.coreservices.content;

import com.sdewa.coreservices.config.HubProperties;
import com.sdewa.coreservices.content.revalidation.RevalidationClient;
import com.sdewa.coreservices.content.revalidation.RevalidationResult;
import com.sdewa.coreservices.content.revalidation.RevalidationService;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/** ADR-003 §11.1: first attempt inline, then retries (1 s, 5 s, 30 s in prod; shortened here). */
class RevalidationServiceTest {

    private static HubProperties props() {
        HubProperties p = new HubProperties();
        p.getRevalidate().setRetryDelays(List.of(Duration.ofMillis(10), Duration.ofMillis(10), Duration.ofMillis(10)));
        return p;
    }

    static final class FakeClient implements RevalidationClient {
        final AtomicInteger calls = new AtomicInteger();
        final int failures;
        final CountDownLatch done;

        FakeClient(int failures, int expectedCalls) {
            this.failures = failures;
            this.done = new CountDownLatch(expectedCalls);
        }

        @Override
        public boolean revalidate(List<String> paths) {
            int n = calls.incrementAndGet();
            done.countDown();
            return n > failures;
        }

        @Override
        public boolean enabled() {
            return true;
        }
    }

    @Test
    void okWhenFirstAttemptSucceeds() {
        FakeClient client = new FakeClient(0, 1);
        RevalidationResult r = new RevalidationService(client, props()).revalidate(List.of("/blog", "/blog", "/sitemap.xml"));
        assertThat(r.status()).isEqualTo("OK");
        assertThat(r.paths()).containsExactly("/blog", "/sitemap.xml");
        assertThat(client.calls.get()).isEqualTo(1);
    }

    @Test
    void pendingRetryThenRetriesInBackgroundUntilSuccess() throws Exception {
        FakeClient client = new FakeClient(2, 3);
        RevalidationResult r = new RevalidationService(client, props()).revalidate(List.of("/blog"));
        assertThat(r.status()).isEqualTo("PENDING_RETRY");
        assertThat(client.done.await(5, TimeUnit.SECONDS)).isTrue();
        Thread.sleep(100);
        assertThat(client.calls.get()).isEqualTo(3);
    }

    @Test
    void givesUpAfterThreeRetries() throws Exception {
        FakeClient client = new FakeClient(100, 4);
        new RevalidationService(client, props()).revalidate(List.of("/blog"));
        assertThat(client.done.await(5, TimeUnit.SECONDS)).isTrue();
        Thread.sleep(200);
        assertThat(client.calls.get()).isEqualTo(4);
    }
}
