package com.sdewa.coreservices.support;

import com.sdewa.coreservices.payment.midtrans.FakeMidtransGateway;
import com.sdewa.coreservices.security.DevTokenController;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.UUID;

/**
 * Base for integration tests: full application context, all Flyway migrations and Hibernate
 * {@code validate} against a Testcontainers PostgreSQL, MockMvc, and HS256 test tokens.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig.class)
public abstract class IntegrationTest {

    public static final String JWT_SECRET = "test-jwt-secret-0123456789-0123456789-0123456789";
    public static final String PROJECT_ID = "hub-test";
    public static final String ADMIN_UID = "test-bootstrap-admin";
    public static final String MIDTRANS_KEY = "test-server-key";

    @Autowired
    protected MockMvc mvc;
    @Autowired
    protected JdbcTemplate jdbc;
    @Autowired
    protected JsonMapper json;
    @Autowired
    protected FakeMidtransGateway midtrans;

    @BeforeEach
    void cleanDatabase() {
        jdbc.execute("""
                TRUNCATE sso_codes, transaction_status_history, transactions, subscription_reminders, subscriptions,
                         user_products, users, article_slug_history, article_tags, article_body_images, articles,
                         categories, tags, images, shedlock CASCADE
                """);
        jdbc.update("DELETE FROM product_redirect_uris");
        jdbc.update("DELETE FROM product_credentials");
        jdbc.update("DELETE FROM plans WHERE code NOT IN ('dd-free', 'dd-pro-monthly')");
        jdbc.update("DELETE FROM products WHERE code <> 'document-doctor'");
        jdbc.update("UPDATE plans SET active = true, is_public = true, name = CASE code WHEN 'dd-free' THEN 'Free' ELSE 'Pro' END");
        jdbc.update("UPDATE products SET active = true WHERE code = 'document-doctor'");
        midtrans.reset();
    }

    protected static String token(String uid) {
        return token(uid, uid + "@example.com", "User " + uid);
    }

    protected static String token(String uid, String email, String name) {
        try {
            return DevTokenController.sign(JWT_SECRET, PROJECT_ID, uid, email, name, "https://img.example/" + uid, "google.com", 3600);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    protected static String bearer(String uid) {
        return "Bearer " + token(uid);
    }

    protected static String adminBearer() {
        return bearer(ADMIN_UID);
    }

    protected JsonNode body(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString());
    }

    protected UUID planId(String code) {
        return jdbc.queryForObject("SELECT id FROM plans WHERE code = ?", UUID.class, code);
    }

    protected UUID productId(String code) {
        return jdbc.queryForObject("SELECT id FROM products WHERE code = ?", UUID.class, code);
    }

    protected UUID userId(String uid) {
        return jdbc.queryForObject("SELECT id FROM users WHERE firebase_uid = ?", UUID.class, uid);
    }
}
