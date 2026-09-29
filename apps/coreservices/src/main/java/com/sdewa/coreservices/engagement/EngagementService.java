package com.sdewa.coreservices.engagement;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.common.util.Ids;
import com.sdewa.coreservices.common.util.Texts;
import com.sdewa.coreservices.engagement.EngagementDtos.AdminAuthor;
import com.sdewa.coreservices.engagement.EngagementDtos.AdminComment;
import com.sdewa.coreservices.engagement.EngagementDtos.ArticleRef;
import com.sdewa.coreservices.engagement.EngagementDtos.CommentInput;
import com.sdewa.coreservices.engagement.EngagementDtos.CommentView;
import com.sdewa.coreservices.engagement.EngagementDtos.InteractionSummary;
import com.sdewa.coreservices.engagement.EngagementDtos.MyComment;
import com.sdewa.coreservices.engagement.EngagementDtos.MyInteraction;
import com.sdewa.coreservices.engagement.EngagementDtos.UserMini;
import com.sdewa.coreservices.engagement.EngagementDtos.VoteResult;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * UC-22 to UC-26 (ADR-010): votes, the one comment per user, mentions, and moderation. Only
 * published articles accept or show interactions; a draft answers 404. The one-per-user rules are
 * the primary key of {@code article_votes} and the unique key of {@code article_comments}.
 */
@Service
@Transactional(readOnly = true)
public class EngagementService {

    public static final int MAX_BODY = 2000;
    public static final int MENTION_SEARCH_LIMIT = 8;

    private static final String COMMENT_COLUMNS = "c.id, c.body, c.status, c.version, c.created_at, c.edited_at, "
            + "u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar";

    private final NamedParameterJdbcTemplate jdbc;

    public EngagementService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ---- Articles ----------------------------------------------------------------------------

    public UUID publishedArticleId(String slug) {
        List<UUID> ids = jdbc.queryForList("SELECT id FROM articles WHERE slug = :slug AND status = 'PUBLISHED'",
                new MapSqlParameterSource("slug", slug), UUID.class);
        if (ids.isEmpty()) {
            throw ApiException.notFound();
        }
        return ids.getFirst();
    }

    private void requirePublished(UUID articleId) {
        Long n = jdbc.queryForObject("SELECT count(*) FROM articles WHERE id = :id AND status = 'PUBLISHED'",
                new MapSqlParameterSource("id", articleId), Long.class);
        if (n == null || n == 0) {
            throw ApiException.notFound();
        }
    }

    // ---- UC-22 reads -------------------------------------------------------------------------

    public InteractionSummary summary(UUID articleId) {
        MapSqlParameterSource p = new MapSqlParameterSource("id", articleId);
        return jdbc.queryForObject("""
                SELECT (SELECT count(*) FROM article_votes WHERE article_id = :id AND value = 1)  AS up,
                       (SELECT count(*) FROM article_votes WHERE article_id = :id AND value = -1) AS down,
                       (SELECT count(*) FROM article_comments WHERE article_id = :id AND status = 'VISIBLE') AS comments
                """, p, (rs, i) -> new InteractionSummary(articleId, rs.getLong("up"), rs.getLong("down"), rs.getLong("comments")));
    }

    public record CommentPage(List<CommentView> items, long total) {
    }

    public CommentPage comments(UUID articleId, PageQuery page) {
        MapSqlParameterSource p = new MapSqlParameterSource("id", articleId)
                .addValue("limit", page.limit()).addValue("offset", page.offset());
        Long total = jdbc.queryForObject("SELECT count(*) FROM article_comments WHERE article_id = :id AND status = 'VISIBLE'", p, Long.class);
        String order = page.direction().isAscending() ? "ASC" : "DESC";
        List<CommentRow> rows = jdbc.query("SELECT " + COMMENT_COLUMNS + " FROM article_comments c JOIN users u ON u.id = c.user_id "
                + "WHERE c.article_id = :id AND c.status = 'VISIBLE' ORDER BY c.created_at " + order + ", c.id " + order
                + " LIMIT :limit OFFSET :offset", p, EngagementService::commentRow);
        Map<UUID, Map<UUID, UserMini>> mentions = mentionsFor(rows.stream().map(CommentRow::id).toList());
        List<CommentView> items = rows.stream().map(r -> new CommentView(r.id(), r.author(), r.body(),
                mentions.getOrDefault(r.id(), Map.of()), r.createdAt(), r.editedAt())).toList();
        return new CommentPage(items, total == null ? 0 : total);
    }

    public MyInteraction mine(UUID articleId, UUID userId) {
        requirePublished(articleId);
        return new MyInteraction(myVote(articleId, userId), myComment(articleId, userId));
    }

    // ---- UC-23 votes -------------------------------------------------------------------------

    @Transactional
    public VoteResult vote(UUID articleId, UUID userId, Integer value) {
        if (value == null || (value != 1 && value != -1)) {
            throw ApiException.validation("value", "Must be 1 or -1.");
        }
        requirePublished(articleId);
        jdbc.update("""
                INSERT INTO article_votes (article_id, user_id, value) VALUES (:a, :u, :v)
                ON CONFLICT (article_id, user_id) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
                WHERE article_votes.value <> EXCLUDED.value
                """, new MapSqlParameterSource("a", articleId).addValue("u", userId).addValue("v", value.shortValue()));
        return voteResult(articleId, value);
    }

    @Transactional
    public VoteResult clearVote(UUID articleId, UUID userId) {
        requirePublished(articleId);
        jdbc.update("DELETE FROM article_votes WHERE article_id = :a AND user_id = :u",
                new MapSqlParameterSource("a", articleId).addValue("u", userId));
        return voteResult(articleId, null);
    }

    private VoteResult voteResult(UUID articleId, Integer myVote) {
        InteractionSummary s = summary(articleId);
        return new VoteResult(articleId, s.upCount(), s.downCount(), s.commentCount(), myVote);
    }

    private Integer myVote(UUID articleId, UUID userId) {
        List<Integer> v = jdbc.queryForList("SELECT value FROM article_votes WHERE article_id = :a AND user_id = :u",
                new MapSqlParameterSource("a", articleId).addValue("u", userId), Integer.class);
        return v.isEmpty() ? null : v.getFirst();
    }

    // ---- UC-24 / UC-25 comments --------------------------------------------------------------

    /** Creates the caller's comment, or edits it when one exists (one per user, ADR-010 I2). */
    @Transactional
    public MyComment saveComment(UUID articleId, UUID userId, CommentInput input) {
        requirePublished(articleId);
        String body = validBody(input == null ? null : input.body());
        Set<UUID> mentioned = Mentions.parse(body);
        requireMentionable(mentioned, userId);

        MapSqlParameterSource key = new MapSqlParameterSource("a", articleId).addValue("u", userId);
        List<CommentRow> existing = jdbc.query("SELECT " + COMMENT_COLUMNS + " FROM article_comments c JOIN users u ON u.id = c.user_id "
                + "WHERE c.article_id = :a AND c.user_id = :u FOR UPDATE OF c", key, EngagementService::commentRow);

        UUID commentId;
        if (existing.isEmpty()) {
            commentId = Ids.uuidV7();
            try {
                jdbc.update("INSERT INTO article_comments (id, article_id, user_id, body) VALUES (:id, :a, :u, :body)",
                        key.addValue("id", commentId).addValue("body", body));
            } catch (DuplicateKeyException e) {
                // Another tab created the comment between our read and insert.
                throw commentConflict();
            }
        } else {
            CommentRow current = existing.getFirst();
            if (current.status() == CommentStatus.HIDDEN) {
                throw new ApiException(ErrorReason.COMMENT_HIDDEN);
            }
            if (input.version() == null || input.version() != current.version()) {
                throw commentConflict();
            }
            commentId = current.id();
            if (current.body().equals(body)) {
                return myComment(articleId, userId);
            }
            jdbc.update("UPDATE article_comments SET body = :body, edited_at = now(), updated_at = now(), version = version + 1 "
                    + "WHERE id = :id", new MapSqlParameterSource("id", commentId).addValue("body", body));
            jdbc.update("DELETE FROM comment_mentions WHERE comment_id = :id", new MapSqlParameterSource("id", commentId));
        }
        insertMentions(commentId, mentioned);
        return myComment(articleId, userId);
    }

    @Transactional
    public void deleteComment(UUID articleId, UUID userId) {
        requirePublished(articleId);
        MapSqlParameterSource key = new MapSqlParameterSource("a", articleId).addValue("u", userId);
        List<String> status = jdbc.queryForList("SELECT status FROM article_comments WHERE article_id = :a AND user_id = :u FOR UPDATE",
                key, String.class);
        if (status.isEmpty()) {
            throw ApiException.notFound();
        }
        // A hidden comment stays, so deleting it cannot be used to get around moderation.
        if (CommentStatus.valueOf(status.getFirst()) == CommentStatus.HIDDEN) {
            throw new ApiException(ErrorReason.COMMENT_HIDDEN);
        }
        jdbc.update("DELETE FROM article_comments WHERE article_id = :a AND user_id = :u", key);
    }

    public List<UserMini> searchMentionable(String q, UUID userId) {
        String query = Texts.trimToNull(q);
        if (query == null || query.length() < 2 || query.length() > 100) {
            throw ApiException.validation("q", "Must be between 2 and 100 characters.");
        }
        return jdbc.query("SELECT id, name, avatar_url FROM users WHERE lower(name) LIKE :q ESCAPE '\\' AND id <> :me "
                        + "ORDER BY lower(name), id LIMIT " + MENTION_SEARCH_LIMIT,
                new MapSqlParameterSource("q", Texts.likeContains(query)).addValue("me", userId),
                (rs, i) -> new UserMini(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("avatar_url")));
    }

    private static String validBody(String raw) {
        String body = raw == null ? "" : raw.trim();
        if (body.isEmpty()) {
            throw ApiException.validation("body", "Must not be empty.");
        }
        if (body.codePointCount(0, body.length()) > MAX_BODY) {
            throw ApiException.validation("body", "Must be at most " + MAX_BODY + " characters.");
        }
        return body;
    }

    private void requireMentionable(Set<UUID> mentioned, UUID authorId) {
        if (mentioned.isEmpty()) {
            return;
        }
        if (mentioned.contains(authorId)) {
            throw new ApiException(ErrorReason.MENTION_INVALID);
        }
        Long found = jdbc.queryForObject("SELECT count(*) FROM users WHERE id IN (:ids)",
                new MapSqlParameterSource("ids", mentioned), Long.class);
        if (found == null || found != mentioned.size()) {
            throw new ApiException(ErrorReason.MENTION_INVALID);
        }
    }

    private void insertMentions(UUID commentId, Set<UUID> mentioned) {
        if (mentioned.isEmpty()) {
            return;
        }
        MapSqlParameterSource[] rows = mentioned.stream()
                .map(id -> new MapSqlParameterSource("c", commentId).addValue("u", id))
                .toArray(MapSqlParameterSource[]::new);
        jdbc.batchUpdate("INSERT INTO comment_mentions (comment_id, mentioned_user_id) VALUES (:c, :u)", rows);
    }

    private MyComment myComment(UUID articleId, UUID userId) {
        List<CommentRow> rows = jdbc.query("SELECT " + COMMENT_COLUMNS + " FROM article_comments c JOIN users u ON u.id = c.user_id "
                        + "WHERE c.article_id = :a AND c.user_id = :u",
                new MapSqlParameterSource("a", articleId).addValue("u", userId), EngagementService::commentRow);
        if (rows.isEmpty()) {
            return null;
        }
        CommentRow r = rows.getFirst();
        return new MyComment(r.id(), r.author(), r.body(), mentionsFor(List.of(r.id())).getOrDefault(r.id(), Map.of()),
                r.status(), r.version(), r.createdAt(), r.editedAt());
    }

    private static ApiException commentConflict() {
        return new ApiException(ErrorReason.VERSION_CONFLICT, "Your comment was changed in another tab; reload before saving");
    }

    // ---- UC-26 moderation --------------------------------------------------------------------

    public record AdminCommentPage(List<AdminComment> items, long total) {
    }

    private static final String ADMIN_FROM = " FROM article_comments c JOIN users u ON u.id = c.user_id "
            + "JOIN articles a ON a.id = c.article_id ";

    private static final String ADMIN_COLUMNS = COMMENT_COLUMNS + ", u.email AS author_email, a.id AS article_id, a.slug AS article_slug, "
            + "(SELECT t.title FROM article_translations t WHERE t.article_id = a.id ORDER BY t.created_at, t.locale LIMIT 1) AS article_title";

    public AdminCommentPage adminList(UUID articleId, CommentStatus status, PageQuery page) {
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        MapSqlParameterSource p = new MapSqlParameterSource();
        if (articleId != null) {
            where.append(" AND c.article_id = :articleId");
            p.addValue("articleId", articleId);
        }
        if (status != null) {
            where.append(" AND c.status = :status");
            p.addValue("status", status.name());
        }
        Long total = jdbc.queryForObject("SELECT count(*)" + ADMIN_FROM + where, p, Long.class);
        String order = page.direction().isAscending() ? "ASC" : "DESC";
        p.addValue("limit", page.limit()).addValue("offset", page.offset());
        List<AdminRow> rows = jdbc.query("SELECT " + ADMIN_COLUMNS + ADMIN_FROM + where + " ORDER BY c.created_at " + order
                + ", c.id " + order + " LIMIT :limit OFFSET :offset", p, EngagementService::adminRow);
        return new AdminCommentPage(toAdmin(rows), total == null ? 0 : total);
    }

    @Transactional
    public AdminComment setStatus(UUID commentId, CommentStatus status) {
        int n = jdbc.update("UPDATE article_comments SET status = :s, updated_at = now() WHERE id = :id",
                new MapSqlParameterSource("s", status.name()).addValue("id", commentId));
        if (n == 0) {
            throw ApiException.notFound();
        }
        List<AdminRow> rows = jdbc.query("SELECT " + ADMIN_COLUMNS + ADMIN_FROM + " WHERE c.id = :id",
                new MapSqlParameterSource("id", commentId), EngagementService::adminRow);
        return toAdmin(rows).getFirst();
    }

    private List<AdminComment> toAdmin(List<AdminRow> rows) {
        Map<UUID, Map<UUID, UserMini>> mentions = mentionsFor(rows.stream().map(r -> r.comment().id()).toList());
        return rows.stream().map(r -> new AdminComment(r.comment().id(), r.article(), r.author(), r.comment().body(),
                mentions.getOrDefault(r.comment().id(), Map.of()), r.comment().status(), r.comment().createdAt(),
                r.comment().editedAt())).toList();
    }

    // ---- Row mapping -------------------------------------------------------------------------

    private record CommentRow(UUID id, UserMini author, String body, CommentStatus status, int version,
                              Instant createdAt, Instant editedAt) {
    }

    private record AdminRow(CommentRow comment, AdminAuthor author, ArticleRef article) {
    }

    private static CommentRow commentRow(ResultSet rs, int i) throws SQLException {
        return new CommentRow(rs.getObject("id", UUID.class),
                new UserMini(rs.getObject("author_id", UUID.class), rs.getString("author_name"), rs.getString("author_avatar")),
                rs.getString("body"), CommentStatus.valueOf(rs.getString("status")), rs.getInt("version"),
                instant(rs.getTimestamp("created_at")), instant(rs.getTimestamp("edited_at")));
    }

    private static AdminRow adminRow(ResultSet rs, int i) throws SQLException {
        CommentRow c = commentRow(rs, i);
        return new AdminRow(c,
                new AdminAuthor(c.author().id(), c.author().name(), rs.getString("author_email"), c.author().avatarUrl()),
                new ArticleRef(rs.getObject("article_id", UUID.class), rs.getString("article_slug"), rs.getString("article_title")));
    }

    /** commentId → (userId → user), in one query for a whole page (no N+1). */
    private Map<UUID, Map<UUID, UserMini>> mentionsFor(List<UUID> commentIds) {
        Map<UUID, Map<UUID, UserMini>> map = new HashMap<>();
        if (commentIds.isEmpty()) {
            return map;
        }
        jdbc.query("SELECT cm.comment_id, u.id, u.name, u.avatar_url FROM comment_mentions cm "
                        + "JOIN users u ON u.id = cm.mentioned_user_id WHERE cm.comment_id IN (:ids)",
                new MapSqlParameterSource("ids", commentIds),
                rs -> {
                    UserMini user = new UserMini(rs.getObject(2, UUID.class), rs.getString(3), rs.getString(4));
                    map.computeIfAbsent(rs.getObject(1, UUID.class), k -> new LinkedHashMap<>()).put(user.id(), user);
                });
        return map;
    }

    private static Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
