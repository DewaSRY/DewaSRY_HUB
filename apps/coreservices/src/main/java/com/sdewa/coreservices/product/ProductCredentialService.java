package com.sdewa.coreservices.product;

import com.sdewa.coreservices.common.util.Hashing;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Verifies and issues product client credentials. Argon2id verification is deliberately slow, so a
 * successful verification is cached in memory for 60 s (keyed by client id and the SHA-256 of the
 * presented secret); a revoke drops the cache entry.
 */
@Service
public class ProductCredentialService {

    private static final long CACHE_MILLIS = 60_000;

    private final ProductCredentialRepository credentials;
    private final ClientSecretHasher hasher;
    private final TransactionTemplate tx;
    private final Clock clock;
    private final Map<String, CachedVerification> cache = new ConcurrentHashMap<>();

    public ProductCredentialService(ProductCredentialRepository credentials, ClientSecretHasher hasher,
                                    TransactionTemplate tx, Clock clock) {
        this.credentials = credentials;
        this.hasher = hasher;
        this.tx = tx;
        this.clock = clock;
    }

    public Optional<AuthenticatedClient> authenticate(String clientId, String clientSecret) {
        if (clientId == null || clientId.isBlank() || clientId.length() > 64 || clientSecret == null || clientSecret.isBlank()
                || clientSecret.length() > 256) {
            return Optional.empty();
        }
        Optional<ProductCredential> found = tx.execute(s -> credentials.findActiveByClientId(clientId).map(c -> {
            c.getProduct().getCode(); // initialise
            return c;
        }));
        if (found == null || found.isEmpty()) {
            return Optional.empty();
        }
        ProductCredential credential = found.get();
        String presented = Hashing.sha256Hex(clientSecret);
        long now = clock.millis();
        CachedVerification cached = cache.get(clientId);
        boolean ok = cached != null && cached.expiresAt > now && cached.secretHash.equals(credential.getSecretHash())
                && Hashing.constantTimeEquals(cached.presentedSha256, presented);
        if (!ok) {
            ok = hasher.matches(clientSecret, credential.getSecretHash());
            if (ok) {
                cache.put(clientId, new CachedVerification(presented, credential.getSecretHash(), now + CACHE_MILLIS));
            }
        }
        if (!ok) {
            return Optional.empty();
        }
        tx.executeWithoutResult(s -> credentials.touchLastUsed(credential.getId()));
        Product product = credential.getProduct();
        return Optional.of(new AuthenticatedClient(credential.getId(), clientId, product.getId(), product.getCode(), product.isActive()));
    }

    /** Creates a credential; the caller must hold a lock on the product row when enforcing limits. */
    @Transactional
    public IssuedCredential issue(Product product) {
        String clientId;
        do {
            clientId = clientIdPrefix(product.getCode()) + "_live_" + Hashing.randomBase32(8);
        } while (credentials.existsByClientId(clientId));
        String secret = Hashing.randomBase62(48);
        ProductCredential credential = new ProductCredential();
        credential.setProduct(product);
        credential.setClientId(clientId);
        credential.setSecretHash(hasher.hash(secret));
        credentials.saveAndFlush(credential);
        Instant createdAt = credential.getCreatedAt() != null ? credential.getCreatedAt() : clock.instant();
        return new IssuedCredential(clientId, secret, createdAt);
    }

    public void forget(String clientId) {
        cache.remove(clientId);
    }

    static String clientIdPrefix(String code) {
        StringBuilder sb = new StringBuilder();
        for (String part : code.split("-")) {
            if (!part.isEmpty()) {
                sb.append(part.charAt(0));
            }
            if (sb.length() == 4) {
                break;
            }
        }
        return sb.isEmpty() ? "app" : sb.toString();
    }

    private record CachedVerification(String presentedSha256, String secretHash, long expiresAt) {
    }

    /** A newly issued credential; the secret is shown once. */
    public record IssuedCredential(String clientId, String clientSecret, Instant createdAt) {
    }
}
