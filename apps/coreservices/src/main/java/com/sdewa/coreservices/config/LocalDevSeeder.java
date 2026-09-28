package com.sdewa.coreservices.config;

import com.sdewa.coreservices.product.ClientSecretHasher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Local profile only: makes sure Document Doctor has a known client credential and a localhost
 * redirect URI, so the product and SSO endpoints can be tried right away. Never runs in prod.
 */
@Component
@Profile("local")
@ConditionalOnProperty(prefix = "hub.local-seed", name = "enabled", havingValue = "true")
public class LocalDevSeeder implements ApplicationRunner {

    public static final String CLIENT_ID = "dd_local_DEVCLIENT";
    public static final String CLIENT_SECRET = "local-dev-secret-0123456789-abcdefghijklmnop";
    public static final String REDIRECT_URI = "http://localhost:3001/auth/callback";

    private static final Logger log = LoggerFactory.getLogger(LocalDevSeeder.class);

    private final JdbcTemplate jdbc;
    private final ClientSecretHasher hasher;

    public LocalDevSeeder(JdbcTemplate jdbc, ClientSecretHasher hasher) {
        this.jdbc = jdbc;
        this.hasher = hasher;
    }

    @Override
    public void run(ApplicationArguments args) {
        UUID productId = jdbc.query("SELECT id FROM products WHERE code = 'document-doctor'",
                rs -> rs.next() ? rs.getObject(1, UUID.class) : null);
        if (productId == null) {
            return;
        }
        int added = jdbc.update("INSERT INTO product_credentials (id, product_id, client_id, secret_hash) VALUES (?, ?, ?, ?) "
                + "ON CONFLICT (client_id) DO NOTHING", UUID.randomUUID(), productId, CLIENT_ID, hasher.hash(CLIENT_SECRET));
        jdbc.update("INSERT INTO product_redirect_uris (id, product_id, uri) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
                UUID.randomUUID(), productId, REDIRECT_URI);
        if (added > 0) {
            log.info("Local seed: Document Doctor client {} / {} (redirect {})", CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
        }
    }
}
