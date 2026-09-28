package com.sdewa.coreservices.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** Every external integration setting of the hub, bound from {@code hub.*}. */
@Getter
@Setter
@ConfigurationProperties(prefix = "hub")
public class HubProperties {

    /** Firebase uid that becomes ADMIN on sign-in (ADR-004 §6). */
    private String bootstrapAdminUid = "";
    /** Public site base URL, used for canonical URLs. */
    private String siteBaseUrl = "http://localhost:3000";

    private Cors cors = new Cors();
    private Firebase firebase = new Firebase();
    private Midtrans midtrans = new Midtrans();
    private Storage storage = new Storage();
    private Media media = new Media();
    private Revalidate revalidate = new Revalidate();
    private Sso sso = new Sso();
    private Jobs jobs = new Jobs();
    private LocalSeed localSeed = new LocalSeed();

    @Getter
    @Setter
    public static class Cors {
        private List<String> allowedOrigins = new ArrayList<>(List.of("http://localhost:3000"));
    }

    @Getter
    @Setter
    public static class Firebase {
        private String projectId = "";
        /** HS256 secret for local/test tokens. Empty = verify real Firebase tokens with Google's JWKS. */
        private String devJwtSecret = "";
        /** {@code fake} or {@code admin-sdk}. */
        private String tokenMinter = "fake";
        private String serviceAccountPath = "";
        private String jwkSetUri = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
    }

    @Getter
    @Setter
    public static class Midtrans {
        /** {@code fake} or {@code live}. */
        private String mode = "fake";
        private String serverKey = "";
        private boolean sandbox = true;
        /** Override for the Snap base URL; empty = derived from {@link #sandbox}. */
        private String snapBaseUrl = "";
        /** Override for the Core/Status API base URL; empty = derived from {@link #sandbox}. */
        private String apiBaseUrl = "";
        private int snapExpiryMinutes = 1440;
        private Duration timeout = Duration.ofSeconds(10);

        public String resolvedSnapBaseUrl() {
            if (snapBaseUrl != null && !snapBaseUrl.isBlank()) {
                return snapBaseUrl;
            }
            return sandbox ? "https://app.sandbox.midtrans.com" : "https://app.midtrans.com";
        }

        public String resolvedApiBaseUrl() {
            if (apiBaseUrl != null && !apiBaseUrl.isBlank()) {
                return apiBaseUrl;
            }
            return sandbox ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com";
        }
    }

    @Getter
    @Setter
    public static class Storage {
        /** {@code local} or {@code s3}. */
        private String type = "local";
        /** CloudFront (or local) base URL that variant keys are appended to. */
        private String publicBaseUrl = "http://localhost:8080/local-media";
        private String localDir = "./build/local-media";
        private String s3Bucket = "";
        private String s3Region = "ap-southeast-1";
    }

    @Getter
    @Setter
    public static class Media {
        private long maxBytes = 10 * 1024 * 1024;
        private List<Integer> widths = new ArrayList<>(List.of(480, 960, 1600));
        private int threads = 2;
    }

    @Getter
    @Setter
    public static class Revalidate {
        private String url = "";
        private String secret = "";
        private Duration timeout = Duration.ofSeconds(3);
        private List<Duration> retryDelays = new ArrayList<>(List.of(Duration.ofSeconds(1), Duration.ofSeconds(5), Duration.ofSeconds(30)));
    }

    @Getter
    @Setter
    public static class Sso {
        private Duration codeTtl = Duration.ofSeconds(60);
        private boolean allowLocalhostRedirects = false;
    }

    @Getter
    @Setter
    public static class Jobs {
        private boolean enabled = true;
    }

    @Getter
    @Setter
    public static class LocalSeed {
        private boolean enabled = false;
    }
}
