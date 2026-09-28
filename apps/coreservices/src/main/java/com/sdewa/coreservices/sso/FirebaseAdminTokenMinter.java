package com.sdewa.coreservices.sso;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.config.HubProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Firebase Admin SDK, used only to create custom tokens (ADR-001 §5.7). The service account key is
 * read from {@code hub.firebase.service-account-path} (an SSM SecureString written to disk at
 * deploy) or, if empty, from Application Default Credentials.
 */
@Component
@ConditionalOnProperty(prefix = "hub.firebase", name = "token-minter", havingValue = "admin-sdk")
public class FirebaseAdminTokenMinter implements FirebaseTokenMinter {

    private final FirebaseAuth auth;

    public FirebaseAdminTokenMinter(HubProperties properties) throws IOException {
        HubProperties.Firebase f = properties.getFirebase();
        GoogleCredentials credentials;
        if (f.getServiceAccountPath() != null && !f.getServiceAccountPath().isBlank()) {
            try (InputStream in = new FileInputStream(f.getServiceAccountPath())) {
                credentials = GoogleCredentials.fromStream(in);
            }
        } else {
            credentials = GoogleCredentials.getApplicationDefault();
        }
        FirebaseOptions options = FirebaseOptions.builder().setCredentials(credentials).setProjectId(f.getProjectId()).build();
        FirebaseApp app = FirebaseApp.getApps().stream().filter(a -> a.getName().equals("hub")).findFirst()
                .orElseGet(() -> FirebaseApp.initializeApp(options, "hub"));
        this.auth = FirebaseAuth.getInstance(app);
    }

    @Override
    public String createCustomToken(String uid) {
        try {
            return auth.createCustomToken(uid);
        } catch (FirebaseAuthException e) {
            throw new ApiException(ErrorReason.UPSTREAM_ERROR, "Could not create the sign-in token");
        }
    }
}
