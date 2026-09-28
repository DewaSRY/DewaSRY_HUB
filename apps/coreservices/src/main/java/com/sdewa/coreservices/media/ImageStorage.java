package com.sdewa.coreservices.media;

/** Where resized image variants live (S3 in prod, the local disk for development). */
public interface ImageStorage {

    void put(String key, byte[] data, String contentType);

    void delete(String key);

    /** Public (CloudFront) URL of a stored key. */
    String publicUrl(String key);
}
