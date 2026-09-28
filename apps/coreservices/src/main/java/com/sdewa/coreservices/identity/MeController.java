package com.sdewa.coreservices.identity;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.identity.IdentityDtos.Me;
import com.sdewa.coreservices.security.HubAuthentication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Group 2 — Account (ADR-003 §6). */
@RestController
@RequestMapping("/me")
public class MeController {

    private final UserService users;

    public MeController(UserService users) {
        this.users = users;
    }

    /** UC-04: find or create the user, refresh the Google profile, 201 for a new user. */
    @PostMapping("/session")
    public ResponseEntity<ApiResponse<Me>> session(HubAuthentication auth) {
        users.recordSignIn(auth.userId(), auth.identity());
        Me me = users.me(auth.userId());
        return auth.userCreated()
                ? Responses.status(HttpStatus.CREATED, me, "Signed up")
                : Responses.ok(me, "Signed in");
    }

    /** UC-05. */
    @GetMapping
    public ResponseEntity<ApiResponse<Me>> me(HubAuthentication auth) {
        return Responses.ok(users.me(auth.userId()));
    }
}
