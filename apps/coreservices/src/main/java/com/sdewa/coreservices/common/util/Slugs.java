package com.sdewa.coreservices.common.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** Slug helpers: lowercase {@code a-z0-9-}, max 120 characters (ADR-003 §10.3). */
public final class Slugs {

    public static final int MAX_LENGTH = 120;
    public static final Pattern VALID = Pattern.compile("^[a-z0-9]+(?:-[a-z0-9]+)*$");
    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");
    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");

    private Slugs() {
    }

    public static String slugify(String input) {
        if (input == null) {
            return "";
        }
        String s = Normalizer.normalize(input, Normalizer.Form.NFKD);
        s = DIACRITICS.matcher(s).replaceAll("").toLowerCase(Locale.ROOT);
        s = NON_ALNUM.matcher(s).replaceAll("-");
        s = trimDashes(s);
        if (s.length() > MAX_LENGTH) {
            s = trimDashes(s.substring(0, MAX_LENGTH));
        }
        return s;
    }

    public static boolean isValid(String slug) {
        return slug != null && slug.length() <= MAX_LENGTH && VALID.matcher(slug).matches();
    }

    public static String withSuffix(String base, int n) {
        String suffix = "-" + n;
        String head = base.length() + suffix.length() > MAX_LENGTH ? base.substring(0, MAX_LENGTH - suffix.length()) : base;
        return trimDashes(head) + suffix;
    }

    private static String trimDashes(String s) {
        int start = 0;
        int end = s.length();
        while (start < end && s.charAt(start) == '-') {
            start++;
        }
        while (end > start && s.charAt(end - 1) == '-') {
            end--;
        }
        return s.substring(start, end);
    }
}
