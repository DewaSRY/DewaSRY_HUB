package com.sdewa.coreservices.identity;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.util.Ids;
import com.sdewa.coreservices.common.util.Texts;
import com.sdewa.coreservices.config.HubProperties;
import com.sdewa.coreservices.identity.IdentityDtos.JoinedProduct;
import com.sdewa.coreservices.identity.IdentityDtos.Me;
import com.sdewa.coreservices.security.TokenIdentity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Users and product memberships (UC-04, UC-05, UC-06). */
@Service
@Transactional
public class UserService {

    private final UserRepository users;
    private final JdbcTemplate jdbc;
    private final HubProperties properties;
    private final Clock clock;

    public UserService(UserRepository users, JdbcTemplate jdbc, HubProperties properties, Clock clock) {
        this.users = users;
        this.jdbc = jdbc;
        this.properties = properties;
        this.clock = clock;
    }

    /** Result of {@link #ensureUser}. */
    public record EnsuredUser(UUID userId, Role role, boolean created) {
    }

    /**
     * Finds or creates the user row for a verified token (PRD OQ4). Creation is an idempotent
     * {@code INSERT ... ON CONFLICT DO NOTHING}, so concurrent first requests are safe. The
     * bootstrap admin uid is promoted to ADMIN here (ADR-004 §6).
     */
    public EnsuredUser ensureUser(TokenIdentity identity) {
        User existing = users.findByFirebaseUid(identity.uid()).orElse(null);
        if (existing != null) {
            promoteIfBootstrap(existing);
            return new EnsuredUser(existing.getId(), existing.getRole(), false);
        }
        String email = Texts.truncate(identity.email() == null ? "" : identity.email(), 320);
        Role role = isBootstrapAdmin(identity.uid()) ? Role.ADMIN : Role.USER;
        int inserted = jdbc.update(
                "INSERT INTO users (id, firebase_uid, email, name, avatar_url, role) VALUES (?, ?, ?, ?, ?, ?) "
                        + "ON CONFLICT (firebase_uid) DO NOTHING",
                Ids.uuidV7(), identity.uid(), email, displayName(identity.name(), email), identity.picture(), role.name());
        User user = users.findByFirebaseUid(identity.uid()).orElseThrow();
        return new EnsuredUser(user.getId(), user.getRole(), inserted == 1);
    }

    /**
     * Sign-in bookkeeping (UC-04 step 6): copies email, name, and picture from a Google sign-in and
     * sets {@code last_sign_in_at}. Custom-token (SSO) sign-ins never overwrite the profile.
     */
    public void recordSignIn(UUID userId, TokenIdentity identity) {
        User user = users.findById(userId).orElseThrow(ApiException::notFound);
        if (!identity.isCustomTokenSignIn()) {
            if (identity.email() != null && !identity.email().isBlank()) {
                user.setEmail(Texts.truncate(identity.email(), 320));
            }
            if (identity.name() != null && !identity.name().isBlank()) {
                user.setName(Texts.truncate(identity.name().trim(), 200));
            }
            if (identity.picture() != null && !identity.picture().isBlank()) {
                user.setAvatarUrl(identity.picture());
            }
        }
        user.setLastSignInAt(clock.instant());
        promoteIfBootstrap(user);
    }

    /** Records that the user joined the product; idempotent. Returns true when the membership is new. */
    public boolean joinProduct(UUID userId, UUID productId) {
        return jdbc.update("INSERT INTO user_products (user_id, product_id, joined_at) VALUES (?, ?, ?) "
                + "ON CONFLICT DO NOTHING", userId, productId, Timestamp.from(clock.instant())) == 1;
    }

    @Transactional(readOnly = true)
    public Instant joinedAt(UUID userId, UUID productId) {
        List<Timestamp> rows = jdbc.queryForList("SELECT joined_at FROM user_products WHERE user_id = ? AND product_id = ?",
                Timestamp.class, userId, productId);
        return rows.isEmpty() ? null : rows.getFirst().toInstant();
    }

    @Transactional(readOnly = true)
    public User get(UUID userId) {
        return users.findById(userId).orElseThrow(ApiException::notFound);
    }

    @Transactional(readOnly = true)
    public Me me(UUID userId) {
        User u = get(userId);
        return new Me(u.getId(), u.getFirebaseUid(), u.getEmail(), u.getName(), u.getAvatarUrl(), u.getRole(),
                joinedProducts(userId), u.getCreatedAt(), u.getLastSignInAt());
    }

    @Transactional(readOnly = true)
    public List<JoinedProduct> joinedProducts(UUID userId) {
        return jdbc.query("SELECT p.code, p.name, up.joined_at FROM user_products up JOIN products p ON p.id = up.product_id "
                        + "WHERE up.user_id = ? ORDER BY up.joined_at",
                (rs, i) -> new JoinedProduct(rs.getString(1), rs.getString(2), rs.getTimestamp(3).toInstant()), userId);
    }

    private void promoteIfBootstrap(User user) {
        if (user.getRole() != Role.ADMIN && isBootstrapAdmin(user.getFirebaseUid())) {
            user.setRole(Role.ADMIN);
        }
    }

    private boolean isBootstrapAdmin(String uid) {
        String bootstrap = properties.getBootstrapAdminUid();
        return bootstrap != null && !bootstrap.isBlank() && bootstrap.equals(uid);
    }

    static String displayName(String name, String email) {
        if (name != null && !name.isBlank()) {
            return Texts.truncate(name.trim(), 200);
        }
        if (email != null && email.contains("@") && email.indexOf('@') > 0) {
            return Texts.truncate(email.substring(0, email.indexOf('@')), 200);
        }
        return "User";
    }
}
