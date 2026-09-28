package com.sdewa.coreservices.security;

import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Map;

/**
 * Profile data carried by a Firebase ID token.
 *
 * @param signInProvider {@code firebase.sign_in_provider}; {@code custom} for SSO custom-token sign-ins,
 *                       whose tokens never overwrite the stored profile (ADR-001 §5.7)
 */
public record TokenIdentity(String uid, String email, String name, String picture, String signInProvider) {

    public static TokenIdentity from(Jwt jwt) {
        String provider = null;
        Object firebase = jwt.getClaims().get("firebase");
        if (firebase instanceof Map<?, ?> map && map.get("sign_in_provider") != null) {
            provider = String.valueOf(map.get("sign_in_provider"));
        }
        return new TokenIdentity(jwt.getSubject(), jwt.getClaimAsString("email"), jwt.getClaimAsString("name"),
                jwt.getClaimAsString("picture"), provider);
    }

    public boolean isCustomTokenSignIn() {
        return "custom".equals(signInProvider);
    }
}
