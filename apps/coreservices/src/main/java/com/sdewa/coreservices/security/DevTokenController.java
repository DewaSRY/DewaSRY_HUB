package com.sdewa.coreservices.security;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.config.HubProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

/**
 * Local-only: issues an HS256 token shaped like a Firebase ID token, signed with
 * {@code hub.firebase.dev-jwt-secret}, so the API can be used without a Firebase project.
 */
@RestController
@RequestMapping("/dev")
@Profile("local")
public class DevTokenController {

    private final HubProperties properties;

    public DevTokenController(HubProperties properties) {
        this.properties = properties;
    }

    public record DevTokenRequest(@NotBlank @Size(max = 128) String uid, String email, String name, String picture, String provider) {
    }

    @PostMapping("/token")
    public ResponseEntity<ApiResponse<Map<String, Object>>> token(@Valid @RequestBody DevTokenRequest r) throws JOSEException {
        String secret = properties.getFirebase().getDevJwtSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("hub.firebase.dev-jwt-secret is not set");
        }
        return Responses.ok(Map.of("idToken", sign(secret, properties.getFirebase().getProjectId(), r.uid(), r.email(), r.name(),
                r.picture(), r.provider() == null ? "google.com" : r.provider(), 3600)));
    }

    /** Also used by tests. */
    public static String sign(String secret, String projectId, String uid, String email, String name, String picture,
                              String provider, long ttlSeconds) throws JOSEException {
        Instant now = Instant.now();
        JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
                .issuer("https://securetoken.google.com/" + projectId)
                .audience(projectId)
                .subject(uid)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(ttlSeconds)))
                .claim("auth_time", now.getEpochSecond())
                .claim("firebase", Map.of("sign_in_provider", provider));
        if (email != null) {
            claims.claim("email", email).claim("email_verified", true);
        }
        if (name != null) {
            claims.claim("name", name);
        }
        if (picture != null) {
            claims.claim("picture", picture);
        }
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims.build());
        jwt.sign(new MACSigner(secret.getBytes(StandardCharsets.UTF_8)));
        return jwt.serialize();
    }
}
