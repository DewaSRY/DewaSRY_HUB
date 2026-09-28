package com.sdewa.coreservices.product;

import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.stereotype.Component;

/** Argon2id hashing of product client secrets (ADR-003 rule C1). Uses BouncyCastle. */
@Component
public class ClientSecretHasher {

    private final Argon2PasswordEncoder encoder = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();

    public String hash(String secret) {
        return encoder.encode(secret);
    }

    public boolean matches(String secret, String hash) {
        if (secret == null || hash == null || hash.isBlank()) {
            return false;
        }
        try {
            return encoder.matches(secret, hash);
        } catch (RuntimeException e) {
            return false;
        }
    }
}
