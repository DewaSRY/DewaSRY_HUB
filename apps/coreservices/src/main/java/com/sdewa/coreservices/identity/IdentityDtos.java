package com.sdewa.coreservices.identity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Account shapes (ADR-003 §6, §8.3). */
public final class IdentityDtos {

    private IdentityDtos() {
    }

    public record JoinedProduct(String code, String name, Instant joinedAt) {
    }

    public record Me(UUID id, String firebaseUid, String email, String name, String avatarUrl, Role role,
                     List<JoinedProduct> products, Instant createdAt, Instant lastSignInAt) {
    }

    /** The profile given to connected products (members, SSO token). */
    public record ProductUser(UUID id, String firebaseUid, String email, String name, String avatarUrl) {
        public static ProductUser of(User u) {
            return new ProductUser(u.getId(), u.getFirebaseUid(), u.getEmail(), u.getName(), u.getAvatarUrl());
        }
    }

    public record Membership(String productCode, Instant joinedAt) {
    }
}
