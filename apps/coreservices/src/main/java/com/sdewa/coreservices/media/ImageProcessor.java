package com.sdewa.coreservices.media;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.config.HubProperties;
import com.sksamuel.scrimage.ImmutableImage;
import com.sksamuel.scrimage.webp.WebpWriter;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Resize-on-upload with Scrimage (ADR-001 §5.9): applies EXIF orientation, drops all metadata (the
 * WebP is re-encoded from pixels), and writes WebP at 480 / 960 / 1600 px, never upscaling. Runs on
 * a small bounded pool so uploads cannot exhaust CPU or memory.
 */
@Component
public class ImageProcessor {

    private static final Logger log = LoggerFactory.getLogger(ImageProcessor.class);
    private static final long MAX_PIXELS = 50_000_000L;

    private final List<Integer> widths;
    private final ThreadPoolExecutor pool;

    public ImageProcessor(HubProperties properties) {
        this.widths = properties.getMedia().getWidths().stream().sorted().toList();
        int threads = Math.max(1, properties.getMedia().getThreads());
        AtomicInteger n = new AtomicInteger();
        this.pool = new ThreadPoolExecutor(threads, threads, 60, TimeUnit.SECONDS, new ArrayBlockingQueue<>(8), r -> {
            Thread t = new Thread(r, "image-resize-" + n.incrementAndGet());
            t.setDaemon(true);
            return t;
        });
    }

    public record Variant(int width, int height, byte[] webp) {
    }

    public enum Format { JPEG, PNG, WEBP }

    /** Detects JPEG / PNG / WebP by magic bytes; {@code null} for anything else. */
    public static Format sniff(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xff) == 0xFF && (b[1] & 0xff) == 0xD8 && (b[2] & 0xff) == 0xFF) {
            return Format.JPEG;
        }
        if (b.length >= 8 && (b[0] & 0xff) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return Format.PNG;
        }
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return Format.WEBP;
        }
        return null;
    }

    public List<Variant> process(byte[] original, Format format) {
        Future<List<Variant>> future;
        try {
            future = pool.submit(() -> doProcess(original, format));
        } catch (RejectedExecutionException e) {
            throw new ApiException(ErrorReason.RATE_LIMITED, "Too many uploads are being processed; try again shortly");
        }
        try {
            return future.get(60, TimeUnit.SECONDS);
        } catch (ExecutionException e) {
            if (e.getCause() instanceof ApiException api) {
                throw api;
            }
            log.warn("Image processing failed: {}", e.getCause() == null ? e.getMessage() : e.getCause().toString());
            throw new ApiException(ErrorReason.IMAGE_UNREADABLE);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new ApiException(ErrorReason.IMAGE_UNREADABLE, "The image took too long to process");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ApiException(ErrorReason.INTERNAL_ERROR);
        }
    }

    private List<Variant> doProcess(byte[] original, Format format) throws Exception {
        if (format != Format.WEBP) {
            checkDimensions(original);
        }
        ImmutableImage image;
        try {
            image = ImmutableImage.loader().detectOrientation(true).fromBytes(original);
        } catch (Exception e) {
            throw new ApiException(ErrorReason.IMAGE_UNREADABLE);
        }
        if ((long) image.width * image.height > MAX_PIXELS) {
            throw new ApiException(ErrorReason.IMAGE_UNREADABLE, "The image dimensions are too large");
        }
        List<Integer> targets = new ArrayList<>();
        for (int w : widths) {
            if (w <= image.width) {
                targets.add(w);
            }
        }
        if (targets.isEmpty()) {
            targets.add(image.width); // smaller than the smallest width: one variant, never upscaled
        }
        WebpWriter writer = WebpWriter.DEFAULT.withQ(80).withM(4);
        List<Variant> out = new ArrayList<>();
        for (int w : targets) {
            ImmutableImage scaled = w == image.width ? image : image.scaleToWidth(w);
            out.add(new Variant(scaled.width, scaled.height, scaled.bytes(writer)));
        }
        return out;
    }

    private static void checkDimensions(byte[] bytes) {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) {
                throw new ApiException(ErrorReason.IMAGE_UNREADABLE);
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in);
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (pixels > MAX_PIXELS) {
                    throw new ApiException(ErrorReason.IMAGE_UNREADABLE, "The image dimensions are too large");
                }
            } finally {
                reader.dispose();
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(ErrorReason.IMAGE_UNREADABLE);
        }
    }

    @PreDestroy
    void shutdown() {
        pool.shutdownNow();
    }
}
