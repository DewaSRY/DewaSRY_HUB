package com.sdewa.coreservices.sso;

import com.sdewa.coreservices.support.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Hub SSO: authorization code + PKCE → Firebase custom token (ADR-001 §5.7). */
class SsoFlowTest extends IntegrationTest {

    private static final String REDIRECT = "https://documentdoctor.example/auth/callback";
    private static final String VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk-verifier-0123456789";

    private String clientId;
    private String secret;

    @BeforeEach
    void registerClient() throws Exception {
        MvcResult r = mvc.perform(post("/v1/admin/products/" + productId("document-doctor") + "/credentials").header("Authorization", adminBearer()))
                .andExpect(status().isCreated()).andReturn();
        clientId = body(r).path("data").path("clientId").stringValue();
        secret = body(r).path("data").path("clientSecret").stringValue();
        mvc.perform(post("/v1/admin/products/" + productId("document-doctor") + "/redirect-uris").header("Authorization", adminBearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"uri\":\"" + REDIRECT + "\"}"))
                .andExpect(status().isCreated());
    }

    private MvcResult code(String uid, String redirectUri, String challenge) throws Exception {
        return mvc.perform(post("/v1/sso/codes").header("Authorization", bearer(uid)).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"clientId":"%s","redirectUri":"%s","codeChallenge":"%s","codeChallengeMethod":"S256"}"""
                        .formatted(clientId, redirectUri, challenge))).andReturn();
    }

    private MvcResult exchange(String code, String verifier, String clientSecret) throws Exception {
        return mvc.perform(post("/v1/sso/token").contentType(MediaType.APPLICATION_JSON).content("""
                {"code":"%s","codeVerifier":"%s","clientId":"%s","clientSecret":"%s"}""".formatted(code, verifier, clientId, clientSecret)))
                .andReturn();
    }

    @Test
    void codeExchangeReturnsCustomTokenProfileAndEntitlementOnce() throws Exception {
        MvcResult issued = code("sso-user", REDIRECT, Pkce.challengeFor(VERIFIER));
        assertThat(issued.getResponse().getStatus()).isEqualTo(201);
        JsonNode data = body(issued).path("data");
        String code = data.path("code").stringValue();
        assertThat(code).hasSizeGreaterThanOrEqualTo(40);
        assertThat(data.path("redirectUri").stringValue()).isEqualTo(REDIRECT);
        // Only the hash is stored; issuing the code joined the product.
        assertThat(jdbc.queryForObject("SELECT count(*) FROM sso_codes WHERE code_hash = ?", Integer.class,
                com.sdewa.coreservices.common.util.Hashing.sha256Hex(code))).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_products", Integer.class)).isEqualTo(1);

        MvcResult token = exchange(code, VERIFIER, secret);
        assertThat(token.getResponse().getStatus()).isEqualTo(200);
        JsonNode t = body(token).path("data");
        assertThat(t.path("customToken").stringValue()).startsWith("fake-custom-token.");
        assertThat(t.path("user").path("firebaseUid").stringValue()).isEqualTo("sso-user");
        assertThat(t.path("user").path("email").stringValue()).isEqualTo("sso-user@example.com");
        assertThat(t.path("entitlement").path("productCode").stringValue()).isEqualTo("document-doctor");

        // Single use: a replay is rejected (400 INVALID_GRANT).
        MvcResult replay = exchange(code, VERIFIER, secret);
        assertThat(replay.getResponse().getStatus()).isEqualTo(400);
        assertThat(body(replay).path("message").stringValue()).contains("invalid, expired, or already used");
    }

    @Test
    void reuseCancelsOtherOpenCodesOfTheUser() throws Exception {
        String a = body(code("sso-user", REDIRECT, Pkce.challengeFor(VERIFIER))).path("data").path("code").stringValue();
        String b = body(code("sso-user", REDIRECT, Pkce.challengeFor(VERIFIER))).path("data").path("code").stringValue();
        assertThat(exchange(a, VERIFIER, secret).getResponse().getStatus()).isEqualTo(200);
        assertThat(exchange(a, VERIFIER, secret).getResponse().getStatus()).isEqualTo(400);
        // b was cancelled by the reuse of a.
        assertThat(exchange(b, VERIFIER, secret).getResponse().getStatus()).isEqualTo(400);
    }

    @Test
    void pkceMismatchIsRejectedAndBurnsTheCode() throws Exception {
        String code = body(code("sso-user", REDIRECT, Pkce.challengeFor(VERIFIER))).path("data").path("code").stringValue();
        MvcResult wrong = exchange(code, VERIFIER.replace('0', '1'), secret);
        assertThat(wrong.getResponse().getStatus()).isEqualTo(400);
        assertThat(exchange(code, VERIFIER, secret).getResponse().getStatus()).isEqualTo(400);
    }

    @Test
    void redirectUriMustMatchExactly() throws Exception {
        for (String uri : new String[]{REDIRECT + "/", REDIRECT + "?x=1", "https://documentdoctor.example/auth/callbackx",
                "https://evil.example/auth/callback", "HTTPS://documentdoctor.example/auth/callback"}) {
            MvcResult r = code("sso-user", uri, Pkce.challengeFor(VERIFIER));
            assertThat(r.getResponse().getStatus()).as(uri).isEqualTo(400);
            assertThat(body(r).path("error").get(0).path("field").stringValue()).isEqualTo("redirectUri");
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM sso_codes", Integer.class)).isZero();
    }

    @Test
    void clientAndChallengeValidation() throws Exception {
        MvcResult badChallenge = code("sso-user", REDIRECT, "short");
        assertThat(badChallenge.getResponse().getStatus()).isEqualTo(400);
        MvcResult plain = mvc.perform(post("/v1/sso/codes").header("Authorization", bearer("u")).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"clientId":"%s","redirectUri":"%s","codeChallenge":"%s","codeChallengeMethod":"plain"}"""
                        .formatted(clientId, REDIRECT, Pkce.challengeFor(VERIFIER)))).andReturn();
        assertThat(plain.getResponse().getStatus()).isEqualTo(400);
        MvcResult unknownClient = mvc.perform(post("/v1/sso/codes").header("Authorization", bearer("u")).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"clientId":"nope","redirectUri":"%s","codeChallenge":"%s"}""".formatted(REDIRECT, Pkce.challengeFor(VERIFIER)))).andReturn();
        assertThat(unknownClient.getResponse().getStatus()).isEqualTo(400);
        assertThat(body(unknownClient).path("error").get(0).path("field").stringValue()).isEqualTo("clientId");
        // /sso/codes needs a user token.
        mvc.perform(post("/v1/sso/codes").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized());

        String code = body(code("sso-user", REDIRECT, Pkce.challengeFor(VERIFIER))).path("data").path("code").stringValue();
        MvcResult wrongSecret = exchange(code, VERIFIER, "wrong-secret");
        assertThat(wrongSecret.getResponse().getStatus()).isEqualTo(401);
        assertThat(body(wrongSecret).path("message").stringValue()).isEqualTo("Invalid client credential");
        // A failed client check does not burn the code.
        assertThat(exchange(code, VERIFIER, secret).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void expiredCodeIsRejected() throws Exception {
        String code = body(code("sso-user", REDIRECT, Pkce.challengeFor(VERIFIER))).path("data").path("code").stringValue();
        jdbc.update("UPDATE sso_codes SET expires_at = now() - interval '1 second'");
        assertThat(exchange(code, VERIFIER, secret).getResponse().getStatus()).isEqualTo(400);
    }

    @Test
    void redirectUriRegistrationRules() throws Exception {
        String base = "/v1/admin/products/" + productId("document-doctor") + "/redirect-uris";
        for (String uri : new String[]{"http://documentdoctor.example/cb", "https://*.example/cb", "https://x.example/cb#frag", "/relative"}) {
            mvc.perform(post(base).header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                            .content("{\"uri\":\"" + uri + "\"}"))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(post(base).header("Authorization", adminBearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"uri\":\"http://localhost:3001/cb\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.uri").value("http://localhost:3001/cb"));
    }
}
