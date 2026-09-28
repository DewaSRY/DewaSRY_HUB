package com.sdewa.coreservices.media;

import com.sdewa.coreservices.media.MediaDtos.ImageView;
import com.sdewa.coreservices.media.MediaDtos.VariantView;
import org.springframework.stereotype.Component;

import java.util.Arrays;

/** Builds the public {@code Image} shape; variant URLs are built at read time, never stored in content. */
@Component
public class ImageViews {

    private final ImageStorage storage;

    public ImageViews(ImageStorage storage) {
        this.storage = storage;
    }

    public ImageView toView(Image image) {
        if (image == null) {
            return null;
        }
        return new ImageView(image.getId(), image.getAlt(), image.getWidth(), image.getHeight(),
                Arrays.stream(image.getVariantWidths()).sorted()
                        .mapToObj(w -> new VariantView(w, storage.publicUrl(image.variantKey(w)))).toList());
    }
}
