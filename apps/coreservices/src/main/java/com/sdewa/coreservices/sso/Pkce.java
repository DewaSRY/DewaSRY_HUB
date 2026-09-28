package com.sdewa.coreservices.sso;

import com.sdewa.coreservices.common.util.Hashing;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.regex.Pattern;

/** PKCE S256 (RFC 7636). */
public final class Pkce {

    private static final Pattern VERIFIER = Pattern.compile("^[A-Za-z0-9\\-._~]{43,128}$");
    private static final Pattern CHALLENGE = Pattern.compile("^[A-Za-z0-9_-]{43,128}$");

    private Pkce() {
    }

    public static boolean isValidChallenge(String challenge) {
        return challenge != null && CHALLENGE.matcher(challenge).matches();
    }

    public static String challengeFor(String verifier) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(Hashing.sha256(verifier));
    }

    public static boolean verify(String verifier, String challenge) {
        if (verifier == null || !VERIFIER.matcher(verifier).matches() || challenge == null) {
            return false;
        }
        return MessageDigest.isEqual(challengeFor(verifier).getBytes(StandardCharsets.US_ASCII),
                challenge.getBytes(StandardCharsets.US_ASCII));
    }
}
