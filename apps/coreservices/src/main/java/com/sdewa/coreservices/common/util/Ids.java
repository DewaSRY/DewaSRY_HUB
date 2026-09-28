package com.sdewa.coreservices.common.util;

import java.security.SecureRandom;
import java.util.UUID;

/** Time-ordered UUIDv7 ids (ADR-004 §3), for rows inserted with native SQL. */
public final class Ids {

    private static final SecureRandom RANDOM = new SecureRandom();

    private Ids() {
    }

    public static UUID uuidV7() {
        long millis = System.currentTimeMillis();
        long randA = RANDOM.nextInt(1 << 12);
        long randB = RANDOM.nextLong();
        long msb = (millis << 16) | (0x7L << 12) | randA;
        long lsb = (randB & 0x3FFFFFFFFFFFFFFFL) | 0x8000000000000000L;
        return new UUID(msb, lsb);
    }
}
