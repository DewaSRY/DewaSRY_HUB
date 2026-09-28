package com.sdewa.coreservices.media;

import com.sdewa.coreservices.common.api.PatchBody;
import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.error.FieldErrorItem;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.common.util.Hashing;
import com.sdewa.coreservices.common.util.Texts;
import com.sdewa.coreservices.config.HubProperties;
import com.sdewa.coreservices.media.MediaDtos.AdminImage;
import com.sdewa.coreservices.media.MediaDtos.ImageView;
import com.sdewa.coreservices.media.MediaDtos.Usage;
import com.sdewa.coreservices.media.MediaDtos.UsedBy;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Media library (UC-19, ADR-003 §10.4). */
@Service
public class MediaService {

    private static final Logger log = LoggerFactory.getLogger(MediaService.class);

    private final ImageRepository images;
    private final ImageProcessor processor;
    private final ImageStorage storage;
    private final ImageViews views;
    private final NamedParameterJdbcTemplate jdbc;
    private final EntityManager em;
    private final TransactionTemplate tx;
    private final HubProperties properties;

    public MediaService(ImageRepository images, ImageProcessor processor, ImageStorage storage, ImageViews views,
                        NamedParameterJdbcTemplate jdbc, EntityManager em, TransactionTemplate tx, HubProperties properties) {
        this.images = images;
        this.processor = processor;
        this.storage = storage;
        this.views = views;
        this.jdbc = jdbc;
        this.em = em;
        this.tx = tx;
        this.properties = properties;
    }

    /** @param created true → 201; false → 200 (same content hash already in the library) */
    public record UploadResult(boolean created, AdminImage image) {
    }

    public UploadResult upload(MultipartFile file, String alt) {
        String cleanAlt = Texts.trimToNull(alt);
        if (file == null || file.isEmpty()) {
            throw ApiException.validation("file", "Is required.");
        }
        if (cleanAlt == null || cleanAlt.length() > 250) {
            throw ApiException.validation("alt", "Must be between 1 and 250 characters.");
        }
        if (file.getSize() > properties.getMedia().getMaxBytes()) {
            throw new ApiException(ErrorReason.PAYLOAD_TOO_LARGE, "The image must be at most 10 MB");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ApiException(ErrorReason.IMAGE_UNREADABLE);
        }
        ImageProcessor.Format format = ImageProcessor.sniff(bytes);
        if (format == null) {
            throw new ApiException(ErrorReason.UNSUPPORTED_MEDIA_TYPE);
        }
        String hash = Hashing.sha256Hex(bytes);
        var existing = images.findByContentHash(hash);
        if (existing.isPresent()) {
            return new UploadResult(false, get(existing.get().getId()));
        }
        List<ImageProcessor.Variant> variants = processor.process(bytes, format);
        String prefix = "images/" + hash + "/";
        for (ImageProcessor.Variant v : variants) {
            storage.put(prefix + v.width() + ".webp", v.webp(), "image/webp");
        }
        ImageProcessor.Variant largest = variants.getLast();
        String fileName = Texts.truncate(file.getOriginalFilename() == null || file.getOriginalFilename().isBlank()
                ? "image" : file.getOriginalFilename().trim(), 255);
        try {
            UUID id = tx.execute(s -> {
                Image image = new Image();
                image.setContentHash(hash);
                image.setS3KeyPrefix(prefix);
                image.setVariantWidths(variants.stream().mapToInt(ImageProcessor.Variant::width).toArray());
                image.setWidth(largest.width());
                image.setHeight(largest.height());
                image.setFileName(fileName);
                image.setSizeBytes(bytes.length);
                image.setAlt(cleanAlt);
                return images.saveAndFlush(image).getId();
            });
            return new UploadResult(true, get(id));
        } catch (DataIntegrityViolationException race) {
            // Uploaded concurrently with the same hash: reuse the stored row (keys are content-addressed).
            Image other = images.findByContentHash(hash).orElseThrow(() -> race);
            return new UploadResult(false, get(other.getId()));
        }
    }

    @Transactional(readOnly = true)
    public AdminImage get(UUID id) {
        Image image = images.findById(id).orElseThrow(ApiException::notFound);
        return toAdmin(image, usage(List.of(id)).getOrDefault(id, List.of()));
    }

    public record ListResult(List<AdminImage> items, long total) {
    }

    @Transactional(readOnly = true)
    public ListResult list(String q, Boolean unused, PageQuery page) {
        StringBuilder where = new StringBuilder(" where 1 = 1");
        Map<String, Object> params = new LinkedHashMap<>();
        if (q != null && !q.isBlank()) {
            where.append(" and (lower(i.alt) like :q escape '\\' or lower(i.fileName) like :q escape '\\')");
            params.put("q", Texts.likeContains(q.trim()));
        }
        if (Boolean.TRUE.equals(unused)) {
            where.append(" and not exists (select 1 from Article a where a.coverImage = i)")
                    .append(" and not exists (select 1 from Article a2 join a2.bodyImages bi where bi = i)");
        } else if (Boolean.FALSE.equals(unused)) {
            where.append(" and (exists (select 1 from Article a where a.coverImage = i)")
                    .append(" or exists (select 1 from Article a2 join a2.bodyImages bi where bi = i))");
        }
        String dir = page.direction().isAscending() ? "asc" : "desc";
        TypedQuery<Image> query = em.createQuery("select i from Image i" + where + " order by i.createdAt " + dir + ", i.id desc", Image.class);
        TypedQuery<Long> count = em.createQuery("select count(i) from Image i" + where, Long.class);
        params.forEach((k, v) -> {
            query.setParameter(k, v);
            count.setParameter(k, v);
        });
        query.setFirstResult((int) page.offset());
        query.setMaxResults(page.limit());
        List<Image> rows = query.getResultList();
        Map<UUID, List<UsedBy>> usage = usage(rows.stream().map(Image::getId).toList());
        return new ListResult(rows.stream().map(i -> toAdmin(i, usage.getOrDefault(i.getId(), List.of()))).toList(),
                count.getSingleResult());
    }

    @Transactional
    public AdminImage patch(UUID id, JsonNode body) {
        Image image = images.findById(id).orElseThrow(ApiException::notFound);
        PatchBody patch = PatchBody.of(body, Set.of("alt"));
        if (patch.has("alt")) {
            String alt = Texts.trimToNull(patch.string("alt"));
            if (alt == null || alt.length() > 250) {
                patch.error("alt", "Must be between 1 and 250 characters.");
            } else {
                image.setAlt(alt);
            }
        }
        patch.throwIfInvalid();
        images.flush();
        return get(id);
    }

    /** Deletes the record and, after commit, the stored variants. 409 IMAGE_IN_USE lists the articles. */
    @Transactional
    public void delete(UUID id) {
        Image image = images.findById(id).orElseThrow(ApiException::notFound);
        List<UsedBy> usedBy = usage(List.of(id)).getOrDefault(id, List.of());
        if (!usedBy.isEmpty()) {
            List<FieldErrorItem> errors = usedBy.stream()
                    .map(u -> u.id()).distinct()
                    .map(aid -> new FieldErrorItem("articles", usedBy.stream().filter(u -> u.id().equals(aid)).findFirst().orElseThrow().title()))
                    .toList();
            throw new ApiException(ErrorReason.IMAGE_IN_USE,
                    "The image is used by " + errors.size() + " article(s)", errors);
        }
        List<String> keys = Arrays.stream(image.getVariantWidths()).mapToObj(image::variantKey).toList();
        images.delete(image);
        images.flush();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                for (String key : keys) {
                    try {
                        storage.delete(key);
                    } catch (RuntimeException e) {
                        log.warn("Could not delete stored variant {}: {}", key, e.getMessage());
                    }
                }
            }
        });
    }

    public ImageView view(Image image) {
        return views.toView(image);
    }

    /** {@code usedBy}: cover images plus body images (ADR-004 §5.5). */
    Map<UUID, List<UsedBy>> usage(Collection<UUID> imageIds) {
        if (imageIds.isEmpty()) {
            return Map.of();
        }
        MapSqlParameterSource p = new MapSqlParameterSource("ids", imageIds);
        List<Object[]> rows = jdbc.query(
                "SELECT a.cover_image_id AS image_id, a.id, a.title, 'COVER' AS usage FROM articles a WHERE a.cover_image_id IN (:ids) "
                        + "UNION ALL SELECT abi.image_id, a.id, a.title, 'BODY' FROM article_body_images abi "
                        + "JOIN articles a ON a.id = abi.article_id WHERE abi.image_id IN (:ids) ORDER BY 3",
                p, (rs, i) -> new Object[]{rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), rs.getString(3), rs.getString(4)});
        return rows.stream().collect(Collectors.groupingBy(r -> (UUID) r[0], LinkedHashMap::new,
                Collectors.mapping(r -> new UsedBy((UUID) r[1], (String) r[2], Usage.valueOf((String) r[3])), Collectors.toList())));
    }

    private AdminImage toAdmin(Image image, List<UsedBy> usedBy) {
        ImageView v = views.toView(image);
        return new AdminImage(v.id(), v.alt(), v.width(), v.height(), v.variants(), image.getFileName(),
                image.getContentHash(), image.getSizeBytes(), usedBy, image.getCreatedAt());
    }
}
