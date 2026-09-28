package com.sdewa.coreservices.common.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/** Small crypto helpers (SHA-256 / SHA-512 hex, constant-time compare, random tokens). */
public final class Hashing {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final char[] BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".toCharArray();
    private static final char[] BASE32 = "ABCDEFGHJKMNPQRSTVWXYZ23456789".toCharArray();

    private Hashing() {
    }

    public static String sha256Hex(byte[] data) {
        return HexFormat.of().formatHex(digest("SHA-256", data));
    }

    public static String sha256Hex(String data) {
        return sha256Hex(data.getBytes(StandardCharsets.UTF_8));
    }

    public static byte[] sha256(String data) {
        return digest("SHA-256", data.getBytes(StandardCharsets.UTF_8));
    }

    public static String sha512Hex(String data) {
        return HexFormat.of().formatHex(digest("SHA-512", data.getBytes(StandardCharsets.UTF_8)));
    }

    public static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    /** URL-safe random token with {@code bytes} bytes of entropy. */
    public static String randomUrlToken(int bytes) {
        byte[] buf = new byte[bytes];
        RANDOM.nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }

    public static String randomBase62(int length) {
        return random(BASE62, length);
    }

    /** Upper-case, unambiguous (no 0/O/1/I/L/U) characters, for human-readable ids. */
    public static String randomBase32(int length) {
        return random(BASE32, length);
    }

    private static String random(char[] alphabet, int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(alphabet[RANDOM.nextInt(alphabet.length)]);
        }
        return sb.toString();
    }

    private static byte[] digest(String algorithm, byte[] data) {
        try {
            return MessageDigest.getInstance(algorithm).digest(data);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
