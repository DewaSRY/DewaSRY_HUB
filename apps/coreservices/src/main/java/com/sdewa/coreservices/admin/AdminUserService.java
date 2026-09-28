package com.sdewa.coreservices.admin;

import com.sdewa.coreservices.common.api.Money;
import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.common.util.Texts;
import com.sdewa.coreservices.identity.IdentityDtos.JoinedProduct;
import com.sdewa.coreservices.identity.Role;
import com.sdewa.coreservices.identity.User;
import com.sdewa.coreservices.identity.UserService;
import com.sdewa.coreservices.subscription.SubscriptionDtos.SubscriptionView;
import com.sdewa.coreservices.subscription.SubscriptionService;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** UC-14: read-only user table with joined products and a paid-transaction summary. */
@Service
@Transactional(readOnly = true)
public class AdminUserService {

    /** API sort field → SQL expression (allow-list, never user input). */
    public static final Map<String, String> SORT = Map.of(
            "createdAt", "u.created_at", "name", "lower(u.name)", "email", "lower(u.email)",
            "lastSignInAt", "u.last_sign_in_at", "paidAmount", "coalesce(p.paid_amount, 0)");

    private final NamedParameterJdbcTemplate jdbc;
    private final UserService users;
    private final SubscriptionService subscriptions;

    public AdminUserService(NamedParameterJdbcTemplate jdbc, UserService users, SubscriptionService subscriptions) {
        this.jdbc = jdbc;
        this.users = users;
        this.subscriptions = subscriptions;
    }

    public record ProductRef(String code, String name) {
    }

    public record PaymentSummary(long paidCount, Money paidAmount, Instant lastPaidAt) {
    }

    public record AdminUserSummary(UUID id, String email, String name, Role role, List<ProductRef> products,
                                   PaymentSummary paymentSummary, Instant createdAt, Instant lastSignInAt) {
    }

    public record AdminUser(UUID id, String firebaseUid, String email, String name, String avatarUrl, Role role,
                            List<JoinedProduct> products, PaymentSummary paymentSummary, List<SubscriptionView> subscriptions,
                            Instant createdAt, Instant lastSignInAt) {
    }

    public record ListResult(List<AdminUserSummary> items, long total) {
    }

    private static final String FROM = " FROM users u LEFT JOIN (SELECT user_id, count(*) AS paid_count, sum(amount) AS paid_amount, "
            + "max(paid_at) AS last_paid_at FROM transactions WHERE status = 'PAID' GROUP BY user_id) p ON p.user_id = u.id ";

    public ListResult list(String q, String productCode, PageQuery page) {
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        MapSqlParameterSource params = new MapSqlParameterSource();
        if (q != null && !q.isBlank()) {
            where.append(" AND (lower(u.name) LIKE :q ESCAPE '\\' OR lower(u.email) LIKE :q ESCAPE '\\')");
            params.addValue("q", Texts.likeContains(q.trim()));
        }
        if (productCode != null && !productCode.isBlank()) {
            where.append(" AND EXISTS (SELECT 1 FROM user_products up JOIN products pr ON pr.id = up.product_id "
                    + "WHERE up.user_id = u.id AND pr.code = :productCode)");
            params.addValue("productCode", productCode);
        }
        String order = " ORDER BY " + page.property() + (page.direction().isAscending() ? " ASC NULLS LAST" : " DESC NULLS LAST") + ", u.id DESC";
        params.addValue("limit", page.limit()).addValue("offset", page.offset());
        Long total = jdbc.queryForObject("SELECT count(*)" + FROM + where, params, Long.class);
        List<AdminUserSummary> rows = jdbc.query(
                "SELECT u.id, u.email, u.name, u.role, u.created_at, u.last_sign_in_at, coalesce(p.paid_count, 0) AS paid_count, "
                        + "coalesce(p.paid_amount, 0) AS paid_amount, p.last_paid_at" + FROM + where + order + " LIMIT :limit OFFSET :offset",
                params, (rs, i) -> new AdminUserSummary(rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("name"),
                        Role.valueOf(rs.getString("role")), List.of(),
                        new PaymentSummary(rs.getLong("paid_count"), Money.idr(rs.getLong("paid_amount")), instant(rs.getTimestamp("last_paid_at"))),
                        instant(rs.getTimestamp("created_at")), instant(rs.getTimestamp("last_sign_in_at"))));
        Map<UUID, List<ProductRef>> products = productsFor(rows.stream().map(AdminUserSummary::id).toList());
        List<AdminUserSummary> withProducts = rows.stream().map(r -> new AdminUserSummary(r.id(), r.email(), r.name(), r.role(),
                products.getOrDefault(r.id(), List.of()), r.paymentSummary(), r.createdAt(), r.lastSignInAt())).toList();
        return new ListResult(withProducts, total == null ? 0 : total);
    }

    public AdminUser get(UUID id) {
        User u = users.get(id);
        PaymentSummary summary = jdbc.queryForObject(
                "SELECT count(*) AS paid_count, coalesce(sum(amount), 0) AS paid_amount, max(paid_at) AS last_paid_at "
                        + "FROM transactions WHERE status = 'PAID' AND user_id = :id",
                new MapSqlParameterSource("id", id),
                (rs, i) -> new PaymentSummary(rs.getLong(1), Money.idr(rs.getLong(2)), instant(rs.getTimestamp(3))));
        return new AdminUser(u.getId(), u.getFirebaseUid(), u.getEmail(), u.getName(), u.getAvatarUrl(), u.getRole(),
                users.joinedProducts(id), summary, subscriptions.listForUser(id), u.getCreatedAt(), u.getLastSignInAt());
    }

    public void requireExists(UUID id) {
        Long n = jdbc.queryForObject("SELECT count(*) FROM users WHERE id = :id", new MapSqlParameterSource("id", id), Long.class);
        if (n == null || n == 0) {
            throw ApiException.notFound();
        }
    }

    private Map<UUID, List<ProductRef>> productsFor(List<UUID> userIds) {
        Map<UUID, List<ProductRef>> map = new LinkedHashMap<>();
        if (userIds.isEmpty()) {
            return map;
        }
        jdbc.query("SELECT up.user_id, p.code, p.name FROM user_products up JOIN products p ON p.id = up.product_id "
                        + "WHERE up.user_id IN (:ids) ORDER BY up.joined_at",
                new MapSqlParameterSource("ids", userIds),
                rs -> {
                    map.computeIfAbsent(rs.getObject(1, UUID.class), k -> new ArrayList<>())
                            .add(new ProductRef(rs.getString(2), rs.getString(3)));
                });
        return map;
    }

    private static Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
