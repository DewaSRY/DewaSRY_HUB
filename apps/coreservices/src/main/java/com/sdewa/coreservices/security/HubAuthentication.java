package com.sdewa.coreservices.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.Collection;
import java.util.UUID;

/**
 * The authenticated hub user: the verified Firebase ID token plus the hub user row it maps to.
 * Controllers take it as a method argument; the user is always taken from here, never from the
 * request (ADR-003 rule A3).
 */
public class HubAuthentication extends JwtAuthenticationToken {

    private final UUID userId;
    private final boolean userCreated;

    public HubAuthentication(Jwt jwt, Collection<? extends GrantedAuthority> authorities, UUID userId, boolean userCreated) {
        super(jwt, authorities, jwt.getSubject());
        this.userId = userId;
        this.userCreated = userCreated;
    }

    public UUID userId() {
        return userId;
    }

    public String firebaseUid() {
        return getToken().getSubject();
    }

    /** True when this request created the user row (first time the hub saw the token). */
    public boolean userCreated() {
        return userCreated;
    }

    public TokenIdentity identity() {
        return TokenIdentity.from(getToken());
    }
}
