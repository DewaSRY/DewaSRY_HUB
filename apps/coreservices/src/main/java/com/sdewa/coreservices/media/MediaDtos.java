package com.sdewa.coreservices.media;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Image shapes (ADR-003 §5.1, §10.4). */
public final class MediaDtos {

    private MediaDtos() {
    }

    public record VariantView(int width, String url) {
    }

    public record ImageView(UUID id, String alt, int width, int height, List<VariantView> variants) {
    }

    public enum Usage { COVER, BODY }

    public record UsedBy(UUID id, String title, Usage usage) {
    }

    public record AdminImage(UUID id, String alt, int width, int height, List<VariantView> variants, String fileName,
                             String contentHash, long sizeBytes, List<UsedBy> usedBy, Instant createdAt) {
    }
}
