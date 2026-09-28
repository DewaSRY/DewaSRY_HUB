package com.sdewa.coreservices.security;

import com.sdewa.coreservices.config.HubProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Verifies Firebase ID tokens as JWTs (ADR-001 §5.7): RS256 signature against Google's JWK set,
 * issuer {@code https://securetoken.google.com/<project>}, audience {@code <project>}, expiry, and a
 * non-empty {@code sub}.
 *
 * <p>For local development and tests, {@code hub.firebase.dev-jwt-secret} switches the signature
 * check to HS256 with that secret; issuer/audience rules stay the same.
 */
@Configuration
public class FirebaseJwtDecoderConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseJwtDecoderConfig.class);

    public static String issuerFor(String projectId) {
        return "https://securetoken.google.com/" + projectId;
    }

    @Bean
    public JwtDecoder jwtDecoder(HubProperties properties) {
        HubProperties.Firebase firebase = properties.getFirebase();
        String projectId = firebase.getProjectId();
        if (projectId == null || projectId.isBlank()) {
            throw new IllegalStateException("hub.firebase.project-id must be set");
        }
        NimbusJwtDecoder decoder;
        if (firebase.getDevJwtSecret() != null && !firebase.getDevJwtSecret().isBlank()) {
            log.warn("Using HS256 dev JWT verification (hub.firebase.dev-jwt-secret is set). Never enable this in production.");
            SecretKeySpec key = new SecretKeySpec(firebase.getDevJwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        } else {
            decoder = NimbusJwtDecoder.withJwkSetUri(firebase.getJwkSetUri()).jwsAlgorithm(SignatureAlgorithm.RS256).build();
        }
        decoder.setJwtValidator(validator(projectId));
        return decoder;
    }

    static OAuth2TokenValidator<Jwt> validator(String projectId) {
        OAuth2TokenValidator<Jwt> audience = jwt -> {
            List<String> aud = jwt.getAudience();
            return aud != null && aud.contains(projectId)
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Wrong audience", null));
        };
        OAuth2TokenValidator<Jwt> subject = jwt -> jwt.getSubject() != null && !jwt.getSubject().isBlank() && jwt.getSubject().length() <= 128
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Missing subject", null));
        return new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuerFor(projectId)), audience, subject);
    }
}
