package com.sdewa.coreservices.product;

import com.sdewa.coreservices.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** UC-21 admin products/plans/credentials and the Group 4 product auth order (ADR-003 §8.2). */
class ProductAndConnectedAuthTest extends IntegrationTest {

    private JsonNode credentialFor(String productCode) throws Exception {
        MvcResult r = mvc.perform(post("/v1/admin/products/" + productId(productCode) + "/credentials").header("Authorization", adminBearer()))
                .andExpect(status().isCreated()).andReturn();
        return body(r).path("data");
    }

    @Test
    void adminCreatesProductWithOneTimeSecretAndManagesPlansAndCredentials() throws Exception {
        MvcResult created = mvc.perform(post("/v1/admin/products").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"quote-tool\",\"name\":\"Quote Tool\",\"websiteUrl\":\"https://quote.example\",\"active\":true}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.code").value("quote-tool"))
                .andExpect(jsonPath("$.data.credential.clientId").value(org.hamcrest.Matchers.startsWith("qt_live_")))
                .andExpect(jsonPath("$.data.credentials.length()").value(1))
                .andReturn();
        JsonNode product = body(created).path("data");
        String secret = product.path("credential").path("clientSecret").stringValue();
        assertThat(secret).hasSizeGreaterThanOrEqualTo(40);
        String hash = jdbc.queryForObject("SELECT secret_hash FROM product_credentials WHERE client_id = ?", String.class,
                product.path("credential").path("clientId").stringValue());
        assertThat(hash).startsWith("$argon2id$").doesNotContain(secret);
        String id = product.path("id").stringValue();

        // The secret is never shown again.
        mvc.perform(get("/v1/admin/products/" + id).header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.data.credential").doesNotExist())
                .andExpect(jsonPath("$.data.credentials[0].clientSecret").doesNotExist());
        mvc.perform(post("/v1/admin/products").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"quote-tool\",\"name\":\"Again\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("The code is already used"));
        mvc.perform(patch("/v1/admin/products/" + id).header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"renamed\"}"))
                .andExpect(status().isBadRequest());

        // Credentials: max 2 active, never revoke the last one.
        JsonNode second = credentialFor("quote-tool");
        mvc.perform(post("/v1/admin/products/" + id + "/credentials").header("Authorization", adminBearer()))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("The product already has two active credentials"));
        mvc.perform(delete("/v1/admin/products/" + id + "/credentials/" + product.path("credential").path("clientId").stringValue())
                .header("Authorization", adminBearer())).andExpect(status().isNoContent());
        mvc.perform(delete("/v1/admin/products/" + id + "/credentials/" + second.path("clientId").stringValue())
                        .header("Authorization", adminBearer()))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("last active credential")));

        // Plans.
        MvcResult plan = mvc.perform(post("/v1/admin/products/" + id + "/plans").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"qt-pro","name":"Pro","price":{"amount":99000,"currency":"IDR"},"billingPeriod":"YEARLY",
                                 "features":{"quotes":100},"public":true,"active":true}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.public").value(true))
                .andExpect(jsonPath("$.data.sold").value(false))
                .andExpect(jsonPath("$.data.features.quotes").value(100))
                .andReturn();
        String planId = body(plan).path("data").path("id").stringValue();
        mvc.perform(post("/v1/admin/products/" + id + "/plans").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"qt-free\",\"name\":\"Free\",\"price\":{\"amount\":0,\"currency\":\"IDR\"},\"billingPeriod\":\"MONTHLY\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error[0].field").value("billingPeriod"));
        mvc.perform(post("/v1/admin/products/" + id + "/plans").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"qt-pro\",\"name\":\"Dup\",\"price\":{\"amount\":1,\"currency\":\"IDR\"},\"billingPeriod\":\"MONTHLY\"}"))
                .andExpect(status().isConflict());
        mvc.perform(patch("/v1/admin/plans/" + planId).header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"price\":{\"amount\":109000,\"currency\":\"IDR\"}}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.price.amount").value(109000));

        // Once sold, price and period are frozen but name / active can change (rule P1).
        jdbc.update("INSERT INTO users (id, firebase_uid, email, name) VALUES (gen_random_uuid(), 'buyer-x', 'b@x.io', 'B')");
        jdbc.update("INSERT INTO transactions (id, order_id, user_id, product_id, plan_id, amount, billing_period, status, paid_at) "
                + "SELECT gen_random_uuid(), 'DSH-TEST-SOLD', u.id, p.product_id, p.id, 109000, 'YEARLY', 'PAID', now() "
                + "FROM users u, plans p WHERE u.firebase_uid = 'buyer-x' AND p.code = 'qt-pro'");
        mvc.perform(patch("/v1/admin/plans/" + planId).header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"price\":{\"amount\":1000,\"currency\":\"IDR\"}}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already sold")));
        mvc.perform(patch("/v1/admin/plans/" + planId).header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Pro 2026\",\"active\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.name").value("Pro 2026"))
                .andExpect(jsonPath("$.data.active").value(false)).andExpect(jsonPath("$.data.sold").value(true));

        mvc.perform(get("/v1/admin/products").header("Authorization", adminBearer()))
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.meta").doesNotExist());
    }

    @Test
    void productAuthCheckOrderAndMembership() throws Exception {
        JsonNode cred = credentialFor("document-doctor");
        String clientId = cred.path("clientId").stringValue();
        String secret = cred.path("clientSecret").stringValue();
        String user = bearer("dd-user");

        // No / wrong credential → 401 INVALID_CLIENT (checked before the user token).
        mvc.perform(post("/v1/products/document-doctor/members"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Invalid client credential"))
                .andExpect(header().exists("X-Trace-Id"));
        mvc.perform(post("/v1/products/document-doctor/members").header("X-Client-Id", clientId).header("X-Client-Secret", "wrong")
                        .header("Authorization", user))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Invalid client credential"));
        // Valid credential, unknown product → 404.
        mvc.perform(get("/v1/products/nope/entitlements/me").header("X-Client-Id", clientId).header("X-Client-Secret", secret)
                .header("Authorization", user)).andExpect(status().isNotFound());
        // Valid credential of another product → 403.
        mvc.perform(post("/v1/admin/products").header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"other-app\",\"name\":\"Other\"}")).andExpect(status().isCreated());
        mvc.perform(get("/v1/products/other-app/entitlements/me").header("X-Client-Id", clientId).header("X-Client-Secret", secret)
                        .header("Authorization", user))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.message").value("You are not allowed to do this"));
        // Valid credential, no user token → 401 UNAUTHENTICATED.
        mvc.perform(post("/v1/products/document-doctor/members").header("X-Client-Id", clientId).header("X-Client-Secret", secret))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Authentication required"));

        // Join: 201 then 200.
        mvc.perform(post("/v1/products/document-doctor/members").header("X-Client-Id", clientId).header("X-Client-Secret", secret)
                        .header("Authorization", user))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.user.firebaseUid").value("dd-user"))
                .andExpect(jsonPath("$.data.membership.productCode").value("document-doctor"))
                .andExpect(jsonPath("$.data.membership.joinedAt").isNotEmpty())
                .andExpect(jsonPath("$.data.entitlement.entitled").value(false));
        mvc.perform(post("/v1/products/document-doctor/members").header("X-Client-Id", clientId).header("X-Client-Secret", secret)
                        .header("Authorization", user))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_products", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT last_used_at FROM product_credentials WHERE client_id = ?", java.sql.Timestamp.class, clientId)).isNotNull();

        // Entitlement without a subscription: free plan, null status/endDate, private cache.
        mvc.perform(get("/v1/products/document-doctor/entitlements/me").header("X-Client-Id", clientId).header("X-Client-Secret", secret)
                        .header("Authorization", user))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, max-age=300"))
                .andExpect(jsonPath("$.data.productCode").value("document-doctor"))
                .andExpect(jsonPath("$.data.entitled").value(false))
                .andExpect(jsonPath("$.data.status").isEmpty())
                .andExpect(jsonPath("$.data.endDate").isEmpty())
                .andExpect(jsonPath("$.data.plan.code").value("dd-free"))
                .andExpect(jsonPath("$.data.features.removeAds").value(false))
                .andExpect(jsonPath("$.data.checkedAt").isNotEmpty());

        // Entitled.
        String uid = jdbc.queryForObject("SELECT id::text FROM users WHERE firebase_uid = 'dd-user'", String.class);
        jdbc.update("INSERT INTO subscriptions (id, user_id, product_id, plan_id, status, start_date, end_date) "
                + "SELECT gen_random_uuid(), ?::uuid, p.product_id, p.id, 'ACTIVE', now() - interval '1 day', now() + interval '29 days' "
                + "FROM plans p WHERE p.code = 'dd-pro-monthly'", uid);
        mvc.perform(get("/v1/products/document-doctor/entitlements/me").header("X-Client-Id", clientId).header("X-Client-Secret", secret)
                        .header("Authorization", user))
                .andExpect(jsonPath("$.data.entitled").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.plan.code").value("dd-pro-monthly"))
                .andExpect(jsonPath("$.data.features.removeAds").value(true));

        // Expired: not entitled, keeps status + endDate, falls back to the free plan.
        jdbc.update("UPDATE subscriptions SET status = 'EXPIRED', end_date = now() - interval '1 hour'");
        mvc.perform(get("/v1/products/document-doctor/entitlements/me").header("X-Client-Id", clientId).header("X-Client-Secret", secret)
                        .header("Authorization", user))
                .andExpect(jsonPath("$.data.entitled").value(false))
                .andExpect(jsonPath("$.data.status").value("EXPIRED"))
                .andExpect(jsonPath("$.data.endDate").isNotEmpty())
                .andExpect(jsonPath("$.data.plan.code").value("dd-free"))
                .andExpect(jsonPath("$.data.features.removeAds").value(false));

        // Inactive product → 403 PRODUCT_INACTIVE (after the credential check).
        jdbc.update("UPDATE products SET active = false WHERE code = 'document-doctor'");
        mvc.perform(get("/v1/products/document-doctor/entitlements/me").header("X-Client-Id", clientId).header("X-Client-Secret", secret)
                        .header("Authorization", user))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.message").value("The product is inactive"));
        jdbc.update("UPDATE products SET active = true WHERE code = 'document-doctor'");

        // Revoked credential → 401 (the verification cache is dropped on revoke).
        credentialFor("document-doctor");
        mvc.perform(delete("/v1/admin/products/" + productId("document-doctor") + "/credentials/" + clientId).header("Authorization", adminBearer()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/v1/products/document-doctor/entitlements/me").header("X-Client-Id", clientId).header("X-Client-Secret", secret)
                        .header("Authorization", user))
                .andExpect(status().isUnauthorized());
    }
}
