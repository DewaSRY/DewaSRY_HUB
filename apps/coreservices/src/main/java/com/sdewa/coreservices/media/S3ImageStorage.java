package com.sdewa.coreservices.media;

import com.sdewa.coreservices.config.HubProperties;
import jakarta.annotation.PreDestroy;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Private S3 bucket behind CloudFront (ADR-001 §5.9). Credentials come from the default provider
 * chain (the EC2 instance role); no access keys in config.
 */
@Component
@ConditionalOnProperty(prefix = "hub.storage", name = "type", havingValue = "s3")
public class S3ImageStorage implements ImageStorage {

    public static final String CACHE_CONTROL = "public, max-age=31536000, immutable";

    private final S3Client s3;
    private final String bucket;
    private final String baseUrl;

    public S3ImageStorage(HubProperties properties) {
        HubProperties.Storage storage = properties.getStorage();
        if (storage.getS3Bucket() == null || storage.getS3Bucket().isBlank()) {
            throw new IllegalStateException("hub.storage.s3-bucket must be set when hub.storage.type=s3");
        }
        this.bucket = storage.getS3Bucket();
        this.baseUrl = LocalImageStorage.trimSlash(storage.getPublicBaseUrl());
        this.s3 = S3Client.builder().region(Region.of(storage.getS3Region())).build();
    }

    @Override
    public void put(String key, byte[] data, String contentType) {
        s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType)
                .cacheControl(CACHE_CONTROL).build(), RequestBody.fromBytes(data));
    }

    @Override
    public void delete(String key) {
        s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }

    @Override
    public String publicUrl(String key) {
        return baseUrl + "/" + key;
    }

    @PreDestroy
    void close() {
        s3.close();
    }
}
