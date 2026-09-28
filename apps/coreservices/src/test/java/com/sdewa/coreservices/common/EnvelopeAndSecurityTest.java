package com.sdewa.coreservices.common;

import com.sdewa.coreservices.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Envelopes (ADR-003 §3.5), trace id, cache headers, CORS, and admin 403 / 401 rules. */
class EnvelopeAndSecurityTest extends IntegrationTest {

    @Test
    void migrationsRunAndSeedIsVisible() {
        Integer plans = jdbc.queryForObject("SELECT count(*) FROM plans p JOIN products pr ON pr.id = p.product_id WHERE pr.code = 'document-doctor'", Integer.class);
        org.assertj.core.api.Assertions.assertThat(plans).isEqualTo(2);
        Integer migrations = jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE success", Integer.class);
        org.assertj.core.api.Assertions.assertThat(migrations).isGreaterThanOrEqualTo(9);
    }

    @Test
    void successEnvelopeHasDataCodeMessageOnlyAndPublicCacheHeaders() throws Exception {
        mvc.perform(get("/v1/public/products"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Trace-Id", matchesPattern("^[a-f0-9]{24}$")))
                .andExpect(header().string("Cache-Control", "public, max-age=60, stale-while-revalidate=600"))
                .andExpect(header().exists("ETag"))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").isString())
                .andExpect(jsonPath("$.data[0].code").value("document-doctor"))
                .andExpect(jsonPath("$.data[0].plans[0].price.amount").value(0))
                .andExpect(jsonPath("$.data[0].plans[0].price.currency").value("IDR"))
                .andExpect(jsonPath("$.data[0].plans[0].billingPeriod").doesNotExist())
                .andExpect(jsonPath("$.data[0].plans[0].features.removeAds").value(false))
                .andExpect(jsonPath("$.data[0].plans[1].billingPeriod").value("MONTHLY"))
                .andExpect(jsonPath("$", not(hasKey("error"))))
                .andExpect(jsonPath("$", not(hasKey("meta"))));
    }

    @Test
    void nullFieldsInsideDataAreIncluded() throws Exception {
        mvc.perform(get("/v1/public/products/document-doctor"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasKey("websiteUrl")))
                .andExpect(jsonPath("$.data.plans[0]", hasKey("billingPeriod")));
    }

    @Test
    void pagedEnvelopeHasMeta() throws Exception {
        mvc.perform(get("/v1/public/articles?page=1&limit=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.meta.total").value(0))
                .andExpect(jsonPath("$.meta.page").value(1))
                .andExpect(jsonPath("$.meta.limit").value(5))
                .andExpect(jsonPath("$.meta.total_page").value(0))
                .andExpect(jsonPath("$.meta", not(hasKey("summary"))));
    }

    @Test
    void errorEnvelopeForNotFoundAndBadPaging() throws Exception {
        mvc.perform(get("/v1/public/products/nope"))
                .andExpect(status().isNotFound())
                .andExpect(header().exists("X-Trace-Id"))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.message").value("Resource not found"))
                .andExpect(jsonPath("$.error").isArray())
                .andExpect(jsonPath("$.error").isEmpty())
                .andExpect(jsonPath("$", not(hasKey("data"))));

        mvc.perform(get("/v1/public/articles?limit=101&page=0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.error[?(@.field == 'limit')]").exists())
                .andExpect(jsonPath("$.error[?(@.field == 'page')]").exists());

        mvc.perform(get("/v1/public/articles?sort=title,asc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error[0].field").value("sort"));
    }

    @Test
    void incomingTraceIdIsReused() throws Exception {
        mvc.perform(get("/v1/public/products").header("X-Trace-Id", "abc-12345-trace"))
                .andExpect(header().string("X-Trace-Id", "abc-12345-trace"));
    }

    @Test
    void missingOrInvalidTokenIs401Envelope() throws Exception {
        mvc.perform(get("/v1/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists("X-Trace-Id"))
                .andExpect(jsonPath("$.code").value(401))
                .andExpect(jsonPath("$.message").value("Authentication required"))
                .andExpect(jsonPath("$.error").isEmpty());
        mvc.perform(get("/v1/me").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void expiredTokenIs401() throws Exception {
        String expired = com.sdewa.coreservices.security.DevTokenController.sign(JWT_SECRET, PROJECT_ID, "u-exp", "e@x.io", "E",
                null, "google.com", -120);
        mvc.perform(get("/v1/me").header("Authorization", "Bearer " + expired)).andExpect(status().isUnauthorized());
    }

    @Test
    void tokenForAnotherProjectIs401() throws Exception {
        String other = com.sdewa.coreservices.security.DevTokenController.sign(JWT_SECRET, "other-project", "u-o", "e@x.io", "E",
                null, "google.com", 3600);
        mvc.perform(get("/v1/me").header("Authorization", "Bearer " + other)).andExpect(status().isUnauthorized());
    }

    @Test
    void nonAdminGets403OnAdminEndpoints() throws Exception {
        mvc.perform(get("/v1/admin/users").header("Authorization", bearer("plain-user")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.error").isEmpty());
        mvc.perform(post("/v1/admin/categories").header("Authorization", bearer("plain-user"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"X\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void bootstrapAdminIsPromotedAndCanUseAdmin() throws Exception {
        mvc.perform(post("/v1/me/session").header("Authorization", adminBearer()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(201))
                .andExpect(jsonPath("$.data.role").value("ADMIN"));
        mvc.perform(get("/v1/admin/users").header("Authorization", adminBearer()))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.meta.total").value(1));
    }

    @Test
    void malformedJsonIs400MalformedRequest() throws Exception {
        mvc.perform(post("/v1/admin/categories").header("Authorization", adminBearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed request body"));
    }

    @Test
    void corsAllowListAndExposedTraceHeader() throws Exception {
        mvc.perform(options("/v1/me").header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "Authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
        mvc.perform(get("/v1/public/products").header("Origin", "http://localhost:3000"))
                .andExpect(header().string("Access-Control-Expose-Headers", org.hamcrest.Matchers.containsString("X-Trace-Id")));
        mvc.perform(options("/v1/me").header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }

    @Test
    void publicEndpointIgnoresStaleToken() throws Exception {
        mvc.perform(get("/v1/public/products").header("Authorization", "Bearer garbage")).andExpect(status().isOk());
    }

    @Test
    void actuatorHealthIsUp() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
    }
}
