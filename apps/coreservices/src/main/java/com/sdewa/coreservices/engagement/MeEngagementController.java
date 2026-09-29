package com.sdewa.coreservices.engagement;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.engagement.EngagementDtos.CommentInput;
import com.sdewa.coreservices.engagement.EngagementDtos.MyComment;
import com.sdewa.coreservices.engagement.EngagementDtos.MyInteraction;
import com.sdewa.coreservices.engagement.EngagementDtos.UserMini;
import com.sdewa.coreservices.engagement.EngagementDtos.VoteInput;
import com.sdewa.coreservices.engagement.EngagementDtos.VoteResult;
import com.sdewa.coreservices.security.HubAuthentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Group 2 — the caller's own interactions (ADR-010 §7.1, UC-22 to UC-25). The user comes from the token. */
@RestController
@RequestMapping("/me")
public class MeEngagementController {

    private final EngagementService engagement;

    public MeEngagementController(EngagementService engagement) {
        this.engagement = engagement;
    }

    @GetMapping("/articles/{articleId}/interaction")
    public ResponseEntity<ApiResponse<MyInteraction>> mine(HubAuthentication auth, @PathVariable UUID articleId) {
        return Responses.ok(engagement.mine(articleId, auth.userId()));
    }

    @PutMapping("/articles/{articleId}/vote")
    public ResponseEntity<ApiResponse<VoteResult>> vote(HubAuthentication auth, @PathVariable UUID articleId,
                                                        @RequestBody VoteInput input) {
        return Responses.ok(engagement.vote(articleId, auth.userId(), input == null ? null : input.value()), Responses.MSG_UPDATED);
    }

    @DeleteMapping("/articles/{articleId}/vote")
    public ResponseEntity<ApiResponse<VoteResult>> clearVote(HubAuthentication auth, @PathVariable UUID articleId) {
        return Responses.ok(engagement.clearVote(articleId, auth.userId()), Responses.MSG_UPDATED);
    }

    @PutMapping("/articles/{articleId}/comment")
    public ResponseEntity<ApiResponse<MyComment>> saveComment(HubAuthentication auth, @PathVariable UUID articleId,
                                                              @RequestBody CommentInput input) {
        return Responses.ok(engagement.saveComment(articleId, auth.userId(), input), Responses.MSG_UPDATED);
    }

    @DeleteMapping("/articles/{articleId}/comment")
    public ResponseEntity<Void> deleteComment(HubAuthentication auth, @PathVariable UUID articleId) {
        engagement.deleteComment(articleId, auth.userId());
        return Responses.noContent();
    }

    @GetMapping("/mentionable-users")
    public ResponseEntity<ApiResponse<List<UserMini>>> mentionable(HubAuthentication auth, @RequestParam(required = false) String q) {
        return Responses.ok(engagement.searchMentionable(q, auth.userId()), Responses.MSG_LIST);
    }
}
