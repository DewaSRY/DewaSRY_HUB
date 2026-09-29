package com.sdewa.coreservices.content;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.config.HubProperties;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * The languages an article can be written in ({@code hub.content.locales}). The first one is the
 * fallback: a reader asking for a language the article does not have gets it, then any other.
 */
@Component
public class ContentLocales {

    private final List<String> supported;

    public ContentLocales(HubProperties properties) {
        List<String> configured = properties.getContent().getLocales().stream()
                .map(l -> l.trim().toLowerCase(Locale.ROOT)).filter(l -> !l.isEmpty()).distinct().toList();
        if (configured.isEmpty()) {
            throw new IllegalStateException("hub.content.locales must list at least one locale");
        }
        this.supported = configured;
    }

    public List<String> supported() {
        return supported;
    }

    public String fallback() {
        return supported.getFirst();
    }

    public boolean isSupported(String locale) {
        return locale != null && supported.contains(locale);
    }

    /** {@code null}/blank → the fallback locale; unknown → 400 on {@code field}. */
    public String resolve(String requested, String field) {
        if (requested == null || requested.isBlank()) {
            return fallback();
        }
        String locale = requested.trim().toLowerCase(Locale.ROOT);
        if (!isSupported(locale)) {
            throw ApiException.validation(field, "Must be one of " + String.join(", ", supported) + ".");
        }
        return locale;
    }

    /** The configured order; unknown locales last, alphabetically. */
    public Comparator<String> order() {
        return Comparator.<String>comparingInt(l -> supported.contains(l) ? supported.indexOf(l) : supported.size())
                .thenComparing(Comparator.naturalOrder());
    }

    /** The language to show: {@code requested} if present, else the fallback, else the first available. */
    public String pick(Collection<String> available, String requested) {
        if (requested != null && available.contains(requested)) {
            return requested;
        }
        if (available.contains(fallback())) {
            return fallback();
        }
        return available.stream().min(order()).orElse(null);
    }

    public List<String> sorted(Collection<String> locales) {
        return locales.stream().sorted(order()).toList();
    }
}
