package com.sdewa.coreservices.sso;

import com.sdewa.coreservices.identity.IdentityDtos.ProductUser;
import com.sdewa.coreservices.subscription.SubscriptionDtos.Entitlement;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/** SSO shapes (ADR-001 §5.7). */
public final class SsoDtos {

    private SsoDtos() {
    }

    public record CodeRequest(@NotBlank @Size(max = 64) String clientId,
                              @NotBlank @Size(max = 2000) String redirectUri,
                              @NotBlank @Size(min = 43, max = 128) String codeChallenge,
                              String codeChallengeMethod) {
    }

    public record CodeResponse(String code, String redirectUri, Instant expiresAt) {
    }

    public record TokenRequest(@NotBlank @Size(max = 256) String code,
                               @NotBlank @Size(max = 256) String codeVerifier,
                               @NotBlank @Size(max = 64) String clientId,
                               @NotBlank @Size(max = 256) String clientSecret,
                               @Size(max = 2000) String redirectUri) {
    }

    public record TokenResponse(String customToken, String tokenType, int expiresIn, ProductUser user, Entitlement entitlement) {
    }
}
