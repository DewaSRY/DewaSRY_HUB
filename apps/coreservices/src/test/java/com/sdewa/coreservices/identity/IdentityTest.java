package com.sdewa.coreservices.identity;

import com.sdewa.coreservices.security.DevTokenController;
import com.sdewa.coreservices.support.IntegrationTest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** UC-04 / UC-05. */
class IdentityTest extends IntegrationTest {

    @Test
    void sessionCreatesThenRefreshesFromGoogleButNeverFromCustomTokens() throws Exception {
        mvc.perform(post("/v1/me/session").header("Authorization", "Bearer " + token("u1", "a@example.com", "Putu Ayu")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.firebaseUid").value("u1"))
                .andExpect(jsonPath("$.data.email").value("a@example.com"))
                .andExpect(jsonPath("$.data.name").value("Putu Ayu"))
                .andExpect(jsonPath("$.data.role").value("USER"))
                .andExpect(jsonPath("$.data.avatarUrl").value("https://img.example/u1"))
                .andExpect(jsonPath("$.data.products").isArray())
                .andExpect(jsonPath("$.data.lastSignInAt").isNotEmpty());

        // Google profile changed → refreshed on the next session (200 for an existing user).
        mvc.perform(post("/v1/me/session").header("Authorization", "Bearer " + token("u1", "new@example.com", "Ayu")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("new@example.com"))
                .andExpect(jsonPath("$.data.name").value("Ayu"));

        // A custom-token (SSO) sign-in never overwrites the profile.
        String custom = DevTokenController.sign(JWT_SECRET, PROJECT_ID, "u1", null, "Hacker", null, "custom", 3600);
        mvc.perform(post("/v1/me/session").header("Authorization", "Bearer " + custom))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Ayu"))
                .andExpect(jsonPath("$.data.email").value("new@example.com"));

        assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(1);
    }

    @Test
    void anyMeCallCreatesTheUserAndNameFallsBackToEmail() throws Exception {
        mvc.perform(get("/v1/me").header("Authorization", "Bearer " + token("u2", "someone@example.com", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("someone"))
                .andExpect(jsonPath("$.data.lastSignInAt").isEmpty());
        mvc.perform(get("/v1/me/subscriptions").header("Authorization", bearer("u2")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        mvc.perform(get("/v1/me/transactions").header("Authorization", bearer("u2")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.meta.total").value(0));
    }
}
