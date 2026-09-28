package com.sdewa.coreservices.sso;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.util.Hashing;
import com.sdewa.coreservices.config.HubProperties;
import com.sdewa.coreservices.identity.IdentityDtos.ProductUser;
import com.sdewa.coreservices.identity.User;
import com.sdewa.coreservices.identity.UserService;
import com.sdewa.coreservices.product.AuthenticatedClient;
import com.sdewa.coreservices.product.Product;
import com.sdewa.coreservices.product.ProductCredential;
import com.sdewa.coreservices.product.ProductCredentialRepository;
import com.sdewa.coreservices.product.ProductCredentialService;
import com.sdewa.coreservices.product.ProductRedirectUriRepository;
import com.sdewa.coreservices.sso.SsoDtos.CodeRequest;
import com.sdewa.coreservices.sso.SsoDtos.CodeResponse;
import com.sdewa.coreservices.sso.SsoDtos.TokenRequest;
import com.sdewa.coreservices.sso.SsoDtos.TokenResponse;
import com.sdewa.coreservices.subscription.EntitlementService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

/**
 * Hub SSO handoff (ADR-001 §5.7): authorization code + PKCE (S256) that ends in a Firebase custom
 * token for the same uid. Codes are random, single use, valid 60 s, stored as SHA-256, and tied to
 * the client id, redirect URI, code challenge, and user. Reusing a code cancels the product's other
 * open codes for that user.
 */
@Service
public class SsoService {

    private static final Logger log = LoggerFactory.getLogger(SsoService.class);

    private final SsoCodeRepository codes;
    private final ProductCredentialRepository credentials;
    private final ProductCredentialService credentialService;
    private final ProductRedirectUriRepository redirectUris;
    private final UserService users;
    private final EntitlementService entitlements;
    private final FirebaseTokenMinter minter;
    private final TransactionTemplate tx;
    private final HubProperties properties;
    private final Clock clock;

    public SsoService(SsoCodeRepository codes, ProductCredentialRepository credentials, ProductCredentialService credentialService,
                      ProductRedirectUriRepository redirectUris, UserService users, EntitlementService entitlements,
                      FirebaseTokenMinter minter, TransactionTemplate tx, HubProperties properties, Clock clock) {
        this.codes = codes;
        this.credentials = credentials;
        this.credentialService = credentialService;
        this.redirectUris = redirectUris;
        this.users = users;
        this.entitlements = entitlements;
        this.minter = minter;
        this.tx = tx;
        this.properties = properties;
        this.clock = clock;
    }

    /** {@code POST /sso/codes}: checks client + exact redirect URI, joins the product, stores a one-time code. */
    public CodeResponse createCode(UUID userId, CodeRequest request) {
        if (request.codeChallengeMethod() != null && !"S256".equals(request.codeChallengeMethod())) {
            throw ApiException.validation("codeChallengeMethod", "Only S256 is supported.");
        }
        if (!Pkce.isValidChallenge(request.codeChallenge())) {
            throw ApiException.validation("codeChallenge", "Must be a base64url S256 challenge (43-128 characters).");
        }
        return tx.execute(s -> {
            ProductCredential credential = credentials.findActiveByClientId(request.clientId())
                    .orElseThrow(() -> ApiException.validation("clientId", "Unknown or revoked client."));
            Product product = credential.getProduct();
            if (!product.isActive()) {
                throw new ApiException(ErrorReason.PRODUCT_INACTIVE);
            }
            if (!redirectUris.existsByProductIdAndUri(product.getId(), request.redirectUri())) {
                throw ApiException.validation("redirectUri", "Is not registered for this client.");
            }
            users.joinProduct(userId, product.getId());
            String code = Hashing.randomUrlToken(32);
            Instant expiresAt = clock.instant().plus(properties.getSso().getCodeTtl());
            SsoCode row = new SsoCode();
            row.setCodeHash(Hashing.sha256Hex(code));
            row.setUserId(userId);
            row.setProductId(product.getId());
            row.setClientId(request.clientId());
            row.setRedirectUri(request.redirectUri());
            row.setCodeChallenge(request.codeChallenge());
            row.setExpiresAt(expiresAt);
            codes.save(row);
            return new CodeResponse(code, request.redirectUri(), expiresAt);
        });
    }

    private record Redeemed(UUID userId, UUID productId, String failure) {
    }

    /** {@code POST /sso/token}: server-to-server code exchange → custom token + profile + entitlement. */
    public TokenResponse exchange(TokenRequest request) {
        AuthenticatedClient client = credentialService.authenticate(request.clientId(), request.clientSecret())
                .orElseThrow(() -> new ApiException(ErrorReason.INVALID_CLIENT));
        if (!client.productActive()) {
            throw new ApiException(ErrorReason.PRODUCT_INACTIVE);
        }
        // The code is burned in its own transaction whatever the outcome, so it can never be tried twice.
        Redeemed redeemed = tx.execute(s -> redeem(client, request));
        if (redeemed.failure() != null) {
            log.warn("SSO code exchange rejected for client {}: {}", client.clientId(), redeemed.failure());
            throw new ApiException(ErrorReason.INVALID_GRANT);
        }
        User user = users.get(redeemed.userId());
        String customToken = minter.createCustomToken(user.getFirebaseUid());
        return new TokenResponse(customToken, "firebase_custom_token", 3600, ProductUser.of(user),
                entitlements.forUser(user.getId(), redeemed.productId()));
    }

    private Redeemed redeem(AuthenticatedClient client, TokenRequest request) {
        Instant now = clock.instant();
        SsoCode code = codes.findByHashForUpdate(Hashing.sha256Hex(request.code())).orElse(null);
        if (code == null) {
            return new Redeemed(null, null, "unknown code");
        }
        if (code.getUsedAt() != null) {
            codes.cancelOpenCodes(code.getUserId(), code.getProductId(), now);
            return new Redeemed(null, null, "code reused");
        }
        code.setUsedAt(now);
        if (code.getCancelledAt() != null) {
            return new Redeemed(null, null, "code cancelled");
        }
        if (!now.isBefore(code.getExpiresAt())) {
            return new Redeemed(null, null, "code expired");
        }
        if (!code.getClientId().equals(client.clientId()) || !code.getProductId().equals(client.productId())) {
            return new Redeemed(null, null, "code issued to another client");
        }
        if (request.redirectUri() != null && !request.redirectUri().equals(code.getRedirectUri())) {
            return new Redeemed(null, null, "redirect_uri mismatch");
        }
        if (!Pkce.verify(request.codeVerifier(), code.getCodeChallenge())) {
            return new Redeemed(null, null, "PKCE verification failed");
        }
        return new Redeemed(code.getUserId(), code.getProductId(), null);
    }
}
