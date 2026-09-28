package com.sdewa.coreservices.payment;

import com.sdewa.coreservices.payment.midtrans.MidtransSignature;
import com.sdewa.coreservices.subscription.SubscriptionService;
import com.sdewa.coreservices.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** UC-08 / UC-09 / UC-10 / UC-11 / UC-12 / UC-13 and the admin payment views (UC-15). */
class BillingFlowTest extends IntegrationTest {

    @Autowired
    SubscriptionService subscriptions;

    private MvcResult checkout(String uid, UUID planId, String idempotencyKey) throws Exception {
        var req = post("/v1/checkout").header("Authorization", bearer(uid)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"planId\":\"" + planId + "\"}");
        if (idempotencyKey != null) {
            req.header("Idempotency-Key", idempotencyKey);
        }
        return mvc.perform(req).andReturn();
    }

    private String buyPro(String uid) throws Exception {
        MvcResult r = checkout(uid, planId("dd-pro-monthly"), null);
        assertThat(r.getResponse().getStatus()).isEqualTo(201);
        return body(r).path("data").path("orderId").stringValue();
    }

    /** Sets the fake Status API answer and posts a correctly signed notification. */
    private MvcResult notify(String orderId, String transactionStatus, Long grossAmount) throws Exception {
        Map<String, Object> status = midtrans.setStatus(orderId, transactionStatus, "accept", "qris", grossAmount);
        Map<String, Object> n = new LinkedHashMap<>(status);
        n.put("signature_key", MidtransSignature.compute(orderId, (String) status.get("status_code"),
                (String) status.get("gross_amount"), MIDTRANS_KEY));
        return mvc.perform(post("/v1/webhooks/midtrans").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(n)))
                .andReturn();
    }

    private Map<String, Object> subscriptionRow(String uid) {
        return jdbc.queryForMap("SELECT s.* FROM subscriptions s JOIN users u ON u.id = s.user_id WHERE u.firebase_uid = ?", uid);
    }

    @Test
    void checkoutCreatesPendingWithSnapAndReusesIt() throws Exception {
        MvcResult first = checkout("buyer", planId("dd-pro-monthly"), null);
        assertThat(first.getResponse().getStatus()).isEqualTo(201);
        JsonNode tx = body(first).path("data");
        assertThat(tx.path("orderId").stringValue()).matches("^DSH-\\d{8}-[A-Z0-9]{6}$");
        assertThat(tx.path("status").stringValue()).isEqualTo("PENDING");
        assertThat(tx.path("price").path("amount").longValue()).isEqualTo(49000);
        assertThat(tx.path("price").path("currency").stringValue()).isEqualTo("IDR");
        assertThat(tx.path("snap").path("token").stringValue()).isNotBlank();
        assertThat(tx.path("snap").path("redirectUrl").stringValue()).startsWith("https://");
        assertThat(tx.path("plan").path("billingPeriod").stringValue()).isEqualTo("MONTHLY");
        assertThat(tx.has("paymentMethod")).isTrue();

        // Same plan again → reuse the unexpired PENDING transaction (200, same order).
        MvcResult again = checkout("buyer", planId("dd-pro-monthly"), null);
        assertThat(again.getResponse().getStatus()).isEqualTo(200);
        assertThat(body(again).path("data").path("orderId").stringValue()).isEqualTo(tx.path("orderId").stringValue());

        // History row from CHECKOUT.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM transaction_status_history WHERE source = 'CHECKOUT'", Integer.class)).isEqualTo(1);

        // Polling own transaction; another user gets 404.
        mvc.perform(get("/v1/me/transactions/" + tx.path("orderId").stringValue()).header("Authorization", bearer("buyer")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("PENDING"));
        mvc.perform(get("/v1/me/transactions/" + tx.path("orderId").stringValue()).header("Authorization", bearer("someone-else")))
                .andExpect(status().isNotFound());
        mvc.perform(get("/v1/me/transactions?status=PENDING").header("Authorization", bearer("buyer")))
                .andExpect(jsonPath("$.meta.total").value(1)).andExpect(jsonPath("$.data[0].snap.token").isNotEmpty());
        mvc.perform(get("/v1/me/transactions?sort=amount").header("Authorization", bearer("buyer"))).andExpect(status().isBadRequest());
    }

    @Test
    void idempotencyKeyReturnsTheFirstResponse() throws Exception {
        String key = UUID.randomUUID().toString();
        MvcResult a = checkout("idem", planId("dd-pro-monthly"), key);
        assertThat(a.getResponse().getStatus()).isEqualTo(201);
        // Expire the snap so plain reuse would not apply; the key still returns the same transaction.
        jdbc.update("UPDATE transactions SET snap_expires_at = now() - interval '1 minute'");
        MvcResult b = checkout("idem", planId("dd-pro-monthly"), key);
        assertThat(b.getResponse().getStatus()).isEqualTo(200);
        assertThat(body(b).path("data").path("orderId").stringValue()).isEqualTo(body(a).path("data").path("orderId").stringValue());
        assertThat(body(b).path("data").path("snap").isNull()).isTrue();
        // Without the key, the expired snap means a new transaction.
        MvcResult c = checkout("idem", planId("dd-pro-monthly"), null);
        assertThat(c.getResponse().getStatus()).isEqualTo(201);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM transactions", Integer.class)).isEqualTo(2);
        // A malformed key is a 400.
        assertThat(checkout("idem", planId("dd-pro-monthly"), "not-a-uuid").getResponse().getStatus()).isEqualTo(400);
    }

    @Test
    void checkoutConflictsAndValidation() throws Exception {
        MvcResult free = checkout("c1", planId("dd-free"), null);
        assertThat(free.getResponse().getStatus()).isEqualTo(409);
        assertThat(body(free).path("message").stringValue()).isEqualTo("The plan cannot be purchased");

        jdbc.update("UPDATE plans SET active = false WHERE code = 'dd-pro-monthly'");
        assertThat(checkout("c1", planId("dd-pro-monthly"), null).getResponse().getStatus()).isEqualTo(409);
        jdbc.update("UPDATE plans SET active = true WHERE code = 'dd-pro-monthly'");

        jdbc.update("UPDATE products SET active = false WHERE code = 'document-doctor'");
        assertThat(checkout("c1", planId("dd-pro-monthly"), null).getResponse().getStatus()).isEqualTo(409);
        jdbc.update("UPDATE products SET active = true WHERE code = 'document-doctor'");

        assertThat(checkout("c1", UUID.randomUUID(), null).getResponse().getStatus()).isEqualTo(404);
        MvcResult missing = mvc.perform(post("/v1/checkout").header("Authorization", bearer("c1"))
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andReturn();
        assertThat(missing.getResponse().getStatus()).isEqualTo(400);
        assertThat(body(missing).path("error").get(0).path("field").stringValue()).isEqualTo("planId");

        // Entitled on another plan of the same product → 409 PLAN_CHANGE_NOT_SUPPORTED.
        jdbc.update("INSERT INTO plans (id, product_id, code, name, price_amount, billing_period, features) "
                + "SELECT gen_random_uuid(), id, 'dd-pro-yearly', 'Pro yearly', 490000, 'YEARLY', '{\"removeAds\":true}' FROM products WHERE code = 'document-doctor'");
        String order = buyPro("c1");
        assertThat(notify(order, "settlement", null).getResponse().getStatus()).isEqualTo(200);
        MvcResult change = checkout("c1", planId("dd-pro-yearly"), null);
        assertThat(change.getResponse().getStatus()).isEqualTo(409);
        assertThat(body(change).path("message").stringValue()).contains("Changing plan");
        // Same plan while entitled is a renewal → allowed.
        assertThat(checkout("c1", planId("dd-pro-monthly"), null).getResponse().getStatus()).isEqualTo(201);
    }

    @Test
    void midtransFailureMarksTransactionFailedAnd502() throws Exception {
        midtrans.failNextSnap();
        MvcResult r = checkout("unlucky", planId("dd-pro-monthly"), null);
        assertThat(r.getResponse().getStatus()).isEqualTo(502);
        String orderId = jdbc.queryForObject("SELECT order_id FROM transactions", String.class);
        assertThat(body(r).path("message").stringValue()).contains(orderId);
        assertThat(body(r).path("code").intValue()).isEqualTo(502);
        assertThat(jdbc.queryForObject("SELECT status FROM transactions", String.class)).isEqualTo("FAILED");
    }

    @Test
    void webhookWithBadSignatureIs403AndChangesNothing() throws Exception {
        String order = buyPro("sig");
        midtrans.setStatus(order, "settlement", "accept", "qris", null);
        String body = """
                {"order_id":"%s","status_code":"200","gross_amount":"49000.00","signature_key":"deadbeef",
                 "transaction_status":"settlement","fraud_status":"accept"}""".formatted(order);
        mvc.perform(post("/v1/webhooks/midtrans").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.received").value(true));
        assertThat(jdbc.queryForObject("SELECT status FROM transactions", String.class)).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM subscriptions", Integer.class)).isZero();
    }

    @Test
    void paidWebhookIsIdempotentAndGrantsAccess() throws Exception {
        String order = buyPro("payer");
        MvcResult r = notify(order, "settlement", null);
        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        assertThat(body(r).path("received").booleanValue()).isTrue();
        assertThat(body(r).has("code")).isFalse();

        Map<String, Object> tx = jdbc.queryForMap("SELECT * FROM transactions WHERE order_id = ?", order);
        assertThat(tx.get("status")).isEqualTo("PAID");
        assertThat(tx.get("payment_method")).isEqualTo("QRIS");
        assertThat(tx.get("paid_at")).isNotNull();
        assertThat(tx.get("subscription_id")).isNotNull();
        Map<String, Object> sub = subscriptionRow("payer");
        assertThat(sub.get("status")).isEqualTo("ACTIVE");
        Instant end = ((Timestamp) sub.get("end_date")).toInstant();
        Instant start = ((Timestamp) sub.get("start_date")).toInstant();
        assertThat(end).isEqualTo(start.atZone(ZoneOffset.UTC).plusMonths(1).toInstant());

        // Replaying the same notification changes nothing.
        int historyBefore = jdbc.queryForObject("SELECT count(*) FROM transaction_status_history", Integer.class);
        assertThat(notify(order, "settlement", null).getResponse().getStatus()).isEqualTo(200);
        assertThat(notify(order, "settlement", null).getResponse().getStatus()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM transaction_status_history", Integer.class)).isEqualTo(historyBefore);
        assertThat(((Timestamp) subscriptionRow("payer").get("end_date")).toInstant()).isEqualTo(end);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM subscriptions", Integer.class)).isEqualTo(1);

        // PAID → FAILED is not allowed: ignored with 200.
        assertThat(notify(order, "expire", null).getResponse().getStatus()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT status FROM transactions WHERE order_id = ?", String.class, order)).isEqualTo("PAID");

        // UC-10 view.
        mvc.perform(get("/v1/me/subscriptions").header("Authorization", bearer("payer")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta").doesNotExist())
                .andExpect(jsonPath("$.data[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.data[0].entitled").value(true))
                .andExpect(jsonPath("$.data[0].plan.code").value("dd-pro-monthly"))
                .andExpect(jsonPath("$.data[0].plan.active").value(true));
        mvc.perform(get("/v1/me/transactions/" + order).header("Authorization", bearer("payer")))
                .andExpect(jsonPath("$.data.status").value("PAID"))
                .andExpect(jsonPath("$.data.snap").isEmpty());

        // Renewal while active extends from the current end date (UC-12).
        String renewal = buyPro("payer");
        assertThat(notify(renewal, "settlement", null).getResponse().getStatus()).isEqualTo(200);
        Instant renewedEnd = ((Timestamp) subscriptionRow("payer").get("end_date")).toInstant();
        assertThat(renewedEnd).isEqualTo(end.atZone(ZoneOffset.UTC).plusMonths(1).toInstant());
    }

    @Test
    void amountMismatchFlagsForReviewWithoutAccess() throws Exception {
        String order = buyPro("cheater");
        assertThat(notify(order, "settlement", 4900L).getResponse().getStatus()).isEqualTo(200);
        Map<String, Object> tx = jdbc.queryForMap("SELECT * FROM transactions WHERE order_id = ?", order);
        assertThat(tx.get("status")).isEqualTo("PENDING");
        assertThat(tx.get("needs_review")).isEqualTo(true);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM subscriptions", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT note FROM transaction_status_history WHERE note LIKE 'amount mismatch%'", String.class))
                .contains("expected 49000");

        mvc.perform(get("/v1/admin/transactions?needsReview=true").header("Authorization", adminBearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].needsReview").value(true))
                .andExpect(jsonPath("$.data[0].user.email").value("cheater@example.com"))
                .andExpect(jsonPath("$.data[0].snap").doesNotExist());
    }

    @Test
    void refundCancelsTheSubscription() throws Exception {
        String order = buyPro("refunded");
        notify(order, "settlement", null);
        assertThat(notify(order, "refund", null).getResponse().getStatus()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT status FROM transactions WHERE order_id = ?", String.class, order)).isEqualTo("REFUNDED");
        Map<String, Object> sub = subscriptionRow("refunded");
        assertThat(sub.get("status")).isEqualTo("CANCELLED");
        assertThat(((Timestamp) sub.get("end_date")).toInstant()).isCloseTo(Instant.now(), within(Duration.ofMinutes(1)));
        mvc.perform(get("/v1/me/subscriptions").header("Authorization", bearer("refunded")))
                .andExpect(jsonPath("$.data[0].entitled").value(false));
    }

    @Test
    void failedPaymentAndUnknownOrderAndStatusApiFailure() throws Exception {
        String order = buyPro("fails");
        assertThat(notify(order, "expire", null).getResponse().getStatus()).isEqualTo(200);
        Map<String, Object> tx = jdbc.queryForMap("SELECT * FROM transactions WHERE order_id = ?", order);
        assertThat(tx.get("status")).isEqualTo("FAILED");
        assertThat((String) tx.get("failure_reason")).contains("expire");

        assertThat(notify("DSH-00000000-NOPE00", "settlement", 1L).getResponse().getStatus()).isEqualTo(200);

        String other = buyPro("fails2");
        midtrans.setFailStatus(true);
        assertThat(notify(other, "settlement", null).getResponse().getStatus()).isEqualTo(502);
        midtrans.setFailStatus(false);
        assertThat(jdbc.queryForObject("SELECT status FROM transactions WHERE order_id = ?", String.class, other)).isEqualTo("PENDING");
    }

    @Test
    void expiryJobExpiresOnlyPastActiveSubscriptionsAndIsIdempotent() throws Exception {
        notify(buyPro("old"), "settlement", null);
        notify(buyPro("current"), "settlement", null);
        jdbc.update("UPDATE subscriptions SET start_date = now() - interval '40 days', end_date = now() - interval '1 hour' "
                + "WHERE user_id = (SELECT id FROM users WHERE firebase_uid = 'old')");
        // Before the job runs, entitlement is already false (rule S1).
        mvc.perform(get("/v1/me/subscriptions").header("Authorization", bearer("old")))
                .andExpect(jsonPath("$.data[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.data[0].entitled").value(false));
        assertThat(subscriptions.expireDue()).isEqualTo(1);
        assertThat(subscriptions.expireDue()).isZero();
        assertThat(subscriptionRow("old").get("status")).isEqualTo("EXPIRED");
        assertThat(subscriptionRow("current").get("status")).isEqualTo("ACTIVE");

        // Buying again after expiry re-activates, starting from now.
        String again = buyPro("old");
        notify(again, "settlement", null);
        Map<String, Object> sub = subscriptionRow("old");
        assertThat(sub.get("status")).isEqualTo("ACTIVE");
        assertThat(((Timestamp) sub.get("end_date")).toInstant()).isAfter(Instant.now().plus(Duration.ofDays(27)));
    }

    @Test
    void adminTransactionListSummaryDetailAndSync() throws Exception {
        String paid = buyPro("adm1");
        notify(paid, "settlement", null);
        buyPro("adm2");
        mvc.perform(get("/v1/admin/transactions?sort=amount,desc").header("Authorization", adminBearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(2))
                .andExpect(jsonPath("$.meta.summary.count").value(2))
                .andExpect(jsonPath("$.meta.summary.paidCount").value(1))
                .andExpect(jsonPath("$.meta.summary.paidAmount.amount").value(49000))
                .andExpect(jsonPath("$.meta.summary.paidAmount.currency").value("IDR"));
        mvc.perform(get("/v1/admin/transactions?status=PAID&status=REFUNDED&productCode=document-doctor&q=adm1&from=2020-01-01&to=2999-12-31")
                        .header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].orderId").value(paid));
        mvc.perform(get("/v1/admin/transactions?from=yesterday").header("Authorization", adminBearer()))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error[0].field").value("from"));
        mvc.perform(get("/v1/admin/transactions/" + paid).header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.data.statusHistory.length()").value(2))
                .andExpect(jsonPath("$.data.statusHistory[0].source").value("CHECKOUT"))
                .andExpect(jsonPath("$.data.statusHistory[1].status").value("PAID"))
                .andExpect(jsonPath("$.data.statusHistory[1].source").value("WEBHOOK"))
                .andExpect(jsonPath("$.data.subscription.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.gatewayTransactionId").value("fake-" + paid));
        mvc.perform(get("/v1/admin/transactions/DSH-NOPE").header("Authorization", adminBearer())).andExpect(status().isNotFound());

        // Sync: a missed webhook is applied with source SYNC.
        String missed = jdbc.queryForObject("SELECT order_id FROM transactions WHERE status = 'PENDING'", String.class);
        midtrans.setStatus(missed, "settlement", "accept", "gopay", null);
        mvc.perform(post("/v1/admin/transactions/" + missed + "/sync").header("Authorization", adminBearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.changed").value(true))
                .andExpect(jsonPath("$.data.status").value("PAID"))
                .andExpect(jsonPath("$.data.paymentMethod").value("GOPAY"))
                .andExpect(jsonPath("$.data.statusHistory[1].source").value("SYNC"));
        mvc.perform(post("/v1/admin/transactions/" + missed + "/sync").header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.data.changed").value(false));
        midtrans.setFailStatus(true);
        mvc.perform(post("/v1/admin/transactions/" + missed + "/sync").header("Authorization", adminBearer()))
                .andExpect(status().isBadGateway());
        midtrans.setFailStatus(false);

        // Admin users: paid summary and sort by paidAmount.
        mvc.perform(get("/v1/admin/users?sort=paidAmount,desc").header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.data[0].paymentSummary.paidCount").value(1))
                .andExpect(jsonPath("$.data[0].paymentSummary.paidAmount.amount").value(49000));
        String userId = jdbc.queryForObject("SELECT id::text FROM users WHERE firebase_uid = 'adm1'", String.class);
        mvc.perform(get("/v1/admin/users/" + userId).header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.data.firebaseUid").value("adm1"))
                .andExpect(jsonPath("$.data.subscriptions[0].status").value("ACTIVE"));
        mvc.perform(get("/v1/admin/users/" + userId + "/transactions").header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.meta.total").value(1));
        mvc.perform(get("/v1/admin/users/" + UUID.randomUUID() + "/transactions").header("Authorization", adminBearer()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/v1/admin/users?q=ADM2").header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].email").value(containsString("adm2")));
    }
}
