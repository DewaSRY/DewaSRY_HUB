package com.sdewa.coreservices.common.util;

/** String helpers. */
public final class Texts {

    private Texts() {
    }

    public static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    public static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    public static String truncate(String s, int max) {
        if (s == null || s.length() <= max) {
            return s;
        }
        return s.substring(0, max);
    }

    /** Escapes {@code %}, {@code _} and {@code \} for a SQL {@code LIKE} pattern and wraps it in {@code %}. */
    public static String likeContains(String q) {
        String escaped = q.toLowerCase().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
