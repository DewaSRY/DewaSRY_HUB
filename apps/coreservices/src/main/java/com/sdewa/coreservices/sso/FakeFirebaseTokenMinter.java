package com.sdewa.coreservices.sso;

import com.sdewa.coreservices.common.util.Hashing;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Local/test minter ({@code hub.firebase.token-minter=fake}): returns an obviously fake,
 * unsigned token string that Firebase would reject. Lets the SSO flow run without a service account.
 */
@Component
@ConditionalOnProperty(prefix = "hub.firebase", name = "token-minter", havingValue = "fake", matchIfMissing = true)
public class FakeFirebaseTokenMinter implements FirebaseTokenMinter {

    private static final Logger log = LoggerFactory.getLogger(FakeFirebaseTokenMinter.class);

    @Override
    public String createCustomToken(String uid) {
        log.info("[fake-firebase] custom token for uid {}", uid);
        String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(("{\"uid\":\"" + uid + "\"}").getBytes(StandardCharsets.UTF_8));
        return "fake-custom-token." + payload + "." + Hashing.randomUrlToken(8);
    }
}
