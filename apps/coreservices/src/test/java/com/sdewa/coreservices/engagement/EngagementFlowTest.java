package com.sdewa.coreservices.engagement;

import com.sdewa.coreservices.support.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** UC-22 to UC-26 (ADR-010): votes, one comment per user, mentions, moderation. */
class EngagementFlowTest extends IntegrationTest {

    private UUID articleId;
    private UUID draftId;

    @BeforeEach
    void articles() {
        UUID category = UUID.randomUUID();
        jdbc.update("INSERT INTO categories (id, name, slug) VALUES (?, 'DevOps', 'devops')", category);
        articleId = article("graviton", "PUBLISHED", category);
        draftId = article("draft-post", "DRAFT", category);
    }

    private UUID article(String slug, String status, UUID category) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO articles (id, slug, category_id, status, published_at) VALUES (?, ?, ?, ?, "
                + "CASE WHEN ? = 'PUBLISHED' THEN now() END)", id, slug, category, status, status);
        jdbc.update("INSERT INTO article_translations (id, article_id, locale, title, excerpt) VALUES (?, ?, 'id', ?, 'x')",
                UUID.randomUUID(), id, "Title " + slug);
        return id;
    }

    /** Any signed-in call creates the user row. */
    private UUID signIn(String uid, String name) throws Exception {
        mvc.perform(post("/v1/me/session").header("Authorization", "Bearer " + token(uid, uid + "@example.com", name)));
        return userId(uid);
    }

    private MvcResult vote(String uid, int value) throws Exception {
        return mvc.perform(put("/v1/me/articles/" + articleId + "/vote").header("Authorization", bearer(uid))
                .contentType(MediaType.APPLICATION_JSON).content("{\"value\":" + value + "}")).andReturn();
    }

    private MvcResult comment(String uid, String body, Integer version) throws Exception {
        String input = json.writeValueAsString(new EngagementDtos.CommentInput(body, version));
        return mvc.perform(put("/v1/me/articles/" + articleId + "/comment").header("Authorization", bearer(uid))
                .contentType(MediaType.APPLICATION_JSON).content(input)).andReturn();
    }

    @Test
    void visitorsCanReadButNotAct() throws Exception {
        mvc.perform(get("/v1/public/articles/graviton/interactions"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "public, max-age=10, stale-while-revalidate=60"))
                .andExpect(jsonPath("$.data.articleId").value(articleId.toString()))
                .andExpect(jsonPath("$.data.upCount").value(0))
                .andExpect(jsonPath("$.data.commentCount").value(0));
        mvc.perform(get("/v1/public/articles/graviton/comments")).andExpect(status().isOk()).andExpect(jsonPath("$.meta.total").value(0));
        mvc.perform(get("/v1/public/articles/draft-post/interactions")).andExpect(status().isNotFound());

        mvc.perform(put("/v1/me/articles/" + articleId + "/vote").contentType(MediaType.APPLICATION_JSON).content("{\"value\":1}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/v1/me/articles/" + articleId + "/comment").contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"hi\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void oneVotePerUserThatSwitchesAndClears() throws Exception {
        signIn("a", "Ayu");
        signIn("b", "Budi");

        assertThat(body(vote("a", 1)).path("data").path("upCount").asInt()).isEqualTo(1);
        // Same vote again changes nothing (idempotent).
        assertThat(body(vote("a", 1)).path("data").path("upCount").asInt()).isEqualTo(1);
        vote("b", 1);
        // Switch: a moves from up to down.
        MvcResult switched = vote("a", -1);
        assertThat(body(switched).path("data").path("upCount").asInt()).isEqualTo(1);
        assertThat(body(switched).path("data").path("downCount").asInt()).isEqualTo(1);
        assertThat(body(switched).path("data").path("myVote").asInt()).isEqualTo(-1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM article_votes", Integer.class)).isEqualTo(2);

        mvc.perform(delete("/v1/me/articles/" + articleId + "/vote").header("Authorization", bearer("a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.downCount").value(0))
                .andExpect(jsonPath("$.data.myVote").isEmpty());

        mvc.perform(get("/v1/me/articles/" + articleId + "/interaction").header("Authorization", bearer("b")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.vote").value(1)).andExpect(jsonPath("$.data.comment").isEmpty());

        // Validation, draft article, and the database rule itself.
        assertThat(vote("a", 2).getResponse().getStatus()).isEqualTo(400);
        mvc.perform(put("/v1/me/articles/" + draftId + "/vote").header("Authorization", bearer("a"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"value\":1}")).andExpect(status().isNotFound());
        UUID b = userId("b");
        assertThatThrownBy(() -> jdbc.update("INSERT INTO article_votes (article_id, user_id, value) VALUES (?, ?, 1)", articleId, b))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void oneCommentPerUserEditedInPlaceWithMentions() throws Exception {
        signIn("a", "Ayu");
        UUID budi = signIn("b", "Budi");
        signIn("c", "Citra");

        // Create (no version).
        MvcResult created = comment("a", "  Great post <@" + budi + ">!  ", null);
        assertThat(created.getResponse().getStatus()).isEqualTo(200);
        var data = body(created).path("data");
        assertThat(data.path("body").stringValue()).isEqualTo("Great post <@" + budi + ">!");
        assertThat(data.path("version").asInt()).isEqualTo(0);
        assertThat(data.path("status").stringValue()).isEqualTo("VISIBLE");
        assertThat(data.path("mentions").path(budi.toString()).path("name").stringValue()).isEqualTo("Budi");
        assertThat(data.path("mentions").path(budi.toString()).has("email")).isFalse();
        assertThat(data.path("editedAt").isNull()).isTrue();

        // A second "create" without the version is a conflict, not a second comment.
        assertThat(comment("a", "Another one", null).getResponse().getStatus()).isEqualTo(409);

        // Edit with the version: same row, editedAt set, mentions rebuilt.
        MvcResult edited = comment("a", "Edited, thanks <@" + userId("c") + ">", 0);
        assertThat(body(edited).path("data").path("id").stringValue()).isEqualTo(data.path("id").stringValue());
        assertThat(body(edited).path("data").path("version").asInt()).isEqualTo(1);
        assertThat(body(edited).path("data").path("editedAt").isNull()).isFalse();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM article_comments", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForList("SELECT mentioned_user_id FROM comment_mentions", UUID.class)).containsExactly(userId("c"));
        // Stale version → conflict.
        assertThat(comment("a", "Stale", 0).getResponse().getStatus()).isEqualTo(409);

        mvc.perform(get("/v1/public/articles/graviton/comments"))
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].author.name").value("Ayu"))
                .andExpect(jsonPath("$.data[0].author.email").doesNotExist())
                .andExpect(jsonPath("$.data[0].version").doesNotExist());
        mvc.perform(get("/v1/public/articles/graviton/interactions")).andExpect(jsonPath("$.data.commentCount").value(1));

        // Mention rules and body rules.
        assertThat(comment("b", "me <@" + budi + ">", null).getResponse().getStatus()).isEqualTo(400);
        assertThat(comment("b", "ghost <@" + UUID.randomUUID() + ">", null).getResponse().getStatus()).isEqualTo(400);
        assertThat(comment("b", "bad <@not-a-uuid>", null).getResponse().getStatus()).isEqualTo(400);
        StringBuilder six = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            six.append("<@").append(UUID.randomUUID()).append("> ");
        }
        assertThat(body(comment("b", six.toString(), null)).path("message").stringValue()).contains("at most 5");
        assertThat(comment("b", "   ", null).getResponse().getStatus()).isEqualTo(400);
        assertThat(comment("b", "x".repeat(2001), null).getResponse().getStatus()).isEqualTo(400);
        assertThat(comment("b", "<script>alert(1)</script> is kept as text", null).getResponse().getStatus()).isEqualTo(200);

        // Delete, then a new comment can be written.
        mvc.perform(delete("/v1/me/articles/" + articleId + "/comment").header("Authorization", bearer("a")))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/v1/me/articles/" + articleId + "/comment").header("Authorization", bearer("a")))
                .andExpect(status().isNotFound());
        assertThat(comment("a", "Back again", null).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void mentionSearchShowsNameAndAvatarOnlyAndNeverTheCaller() throws Exception {
        signIn("a", "Budiman");
        signIn("b", "Budi");
        signIn("c", "Citra");
        mvc.perform(get("/v1/me/mentionable-users").param("q", "bud").header("Authorization", bearer("a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].name").value("Budi"))
                .andExpect(jsonPath("$.data[0].email").doesNotExist());
        mvc.perform(get("/v1/me/mentionable-users").param("q", "b").header("Authorization", bearer("a")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminHidesAndShowsComments() throws Exception {
        signIn("a", "Ayu");
        String id = body(comment("a", "Spam spam", null)).path("data").path("id").stringValue();

        mvc.perform(get("/v1/admin/comments").header("Authorization", bearer("a"))).andExpect(status().isForbidden());
        mvc.perform(get("/v1/admin/comments").param("status", "VISIBLE").header("Authorization", adminBearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].article.slug").value("graviton"))
                .andExpect(jsonPath("$.data[0].article.title").value("Title graviton"))
                .andExpect(jsonPath("$.data[0].author.email").value("a@example.com"));

        mvc.perform(post("/v1/admin/comments/" + id + "/hide").header("Authorization", adminBearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("HIDDEN"));
        mvc.perform(get("/v1/public/articles/graviton/comments")).andExpect(jsonPath("$.meta.total").value(0));
        mvc.perform(get("/v1/public/articles/graviton/interactions")).andExpect(jsonPath("$.data.commentCount").value(0));

        // The author sees it as hidden and can neither edit nor delete it.
        mvc.perform(get("/v1/me/articles/" + articleId + "/interaction").header("Authorization", bearer("a")))
                .andExpect(jsonPath("$.data.comment.status").value("HIDDEN"));
        assertThat(comment("a", "Edited spam", 0).getResponse().getStatus()).isEqualTo(409);
        mvc.perform(delete("/v1/me/articles/" + articleId + "/comment").header("Authorization", bearer("a")))
                .andExpect(status().isConflict());

        mvc.perform(post("/v1/admin/comments/" + id + "/show").header("Authorization", adminBearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("VISIBLE"));
        mvc.perform(post("/v1/admin/comments/" + UUID.randomUUID() + "/hide").header("Authorization", adminBearer()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletingAnArticleRemovesItsInteractions() throws Exception {
        signIn("a", "Ayu");
        vote("a", 1);
        comment("a", "Hello", null);
        jdbc.update("DELETE FROM articles WHERE id = ?", articleId);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM article_votes", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM article_comments", Integer.class)).isZero();
    }
}
