package com.sdewa.coreservices.media;

import com.sdewa.coreservices.config.HubProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** Stores variants under {@code hub.storage.local-dir}; served by the API at {@code /local-media/**}. */
@Component
@ConditionalOnProperty(prefix = "hub.storage", name = "type", havingValue = "local", matchIfMissing = true)
public class LocalImageStorage implements ImageStorage {

    private static final Logger log = LoggerFactory.getLogger(LocalImageStorage.class);

    private final Path root;
    private final String baseUrl;

    public LocalImageStorage(HubProperties properties) {
        this.root = Path.of(properties.getStorage().getLocalDir()).toAbsolutePath().normalize();
        this.baseUrl = trimSlash(properties.getStorage().getPublicBaseUrl());
        log.info("Local image storage at {} (served from {})", root, baseUrl);
    }

    @Override
    public void put(String key, byte[] data, String contentType) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, data);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException e) {
            log.warn("Could not delete {}: {}", key, e.getMessage());
        }
    }

    @Override
    public String publicUrl(String key) {
        return baseUrl + "/" + key;
    }

    public boolean exists(String key) {
        return Files.exists(resolve(key));
    }

    private Path resolve(String key) {
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) {
            throw new IllegalArgumentException("Invalid key");
        }
        return p;
    }

    static String trimSlash(String s) {
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }
}
