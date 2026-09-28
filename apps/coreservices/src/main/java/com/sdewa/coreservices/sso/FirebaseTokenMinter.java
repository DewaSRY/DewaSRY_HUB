package com.sdewa.coreservices.sso;

/** Creates a Firebase custom token for a uid (hub SSO, ADR-001 §5.7). No extra claims. */
public interface FirebaseTokenMinter {

    String createCustomToken(String uid);
}
