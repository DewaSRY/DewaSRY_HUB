package com.sdewa.coreservices.engagement;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Shapes of ADR-010 §7.2. Other users are only ever shown as {@link UserMini} (no email, D5). */
public final class EngagementDtos {

    private EngagementDtos() {
    }

    public record UserMini(UUID id, String name, String avatarUrl) {
    }

    public record InteractionSummary(UUID articleId, long upCount, long downCount, long commentCount) {
    }

    /** {@code myVote}: 1, -1, or null when the caller has no vote. */
    public record VoteResult(UUID articleId, long upCount, long downCount, long commentCount, Integer myVote) {
    }

    /** {@code body} holds {@code <@userId>} tokens; {@code mentions} resolves each of them. */
    public record CommentView(UUID id, UserMini author, String body, Map<UUID, UserMini> mentions,
                              Instant createdAt, Instant editedAt) {
    }

    /** The caller's own comment: also the moderation status and the version to send on edit. */
    public record MyComment(UUID id, UserMini author, String body, Map<UUID, UserMini> mentions, CommentStatus status,
                            int version, Instant createdAt, Instant editedAt) {
    }

    public record MyInteraction(Integer vote, MyComment comment) {
    }

    public record VoteInput(Integer value) {
    }

    /** {@code version}: omitted when creating; the current version when editing. */
    public record CommentInput(String body, Integer version) {
    }

    public record ArticleRef(UUID id, String slug, String title) {
    }

    public record AdminAuthor(UUID id, String name, String email, String avatarUrl) {
    }

    public record AdminComment(UUID id, ArticleRef article, AdminAuthor author, String body, Map<UUID, UserMini> mentions,
                               CommentStatus status, Instant createdAt, Instant editedAt) {
    }
}
