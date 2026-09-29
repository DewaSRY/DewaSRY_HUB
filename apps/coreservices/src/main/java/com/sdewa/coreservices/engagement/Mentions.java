package com.sdewa.coreservices.engagement;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Mention tokens {@code <@userId>} inside a comment body (ADR-010 I3, §7.3). Anything else that
 * looks like markup stays plain text; the frontend renders it as text, never as HTML.
 */
public final class Mentions {

    public static final int MAX_MENTIONS = 5;

    private static final Pattern TOKEN = Pattern.compile("<@([^<>\\s]{1,64})>");

    private Mentions() {
    }

    /** Distinct mentioned user ids in order of first use. Rejects malformed ids and more than {@link #MAX_MENTIONS}. */
    public static Set<UUID> parse(String body) {
        Set<UUID> ids = new LinkedHashSet<>();
        Matcher m = TOKEN.matcher(body);
        while (m.find()) {
            try {
                ids.add(UUID.fromString(m.group(1)));
            } catch (IllegalArgumentException e) {
                throw new ApiException(ErrorReason.MENTION_INVALID);
            }
        }
        if (ids.size() > MAX_MENTIONS) {
            throw new ApiException(ErrorReason.MENTION_LIMIT);
        }
        return ids;
    }
}
