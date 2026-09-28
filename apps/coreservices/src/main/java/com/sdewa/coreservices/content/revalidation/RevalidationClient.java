package com.sdewa.coreservices.content.revalidation;

import java.util.List;

/** Outbound call to the Next.js revalidate route (ADR-003 §11.1). */
public interface RevalidationClient {

    /** @return true when the site confirmed the revalidation (2xx) */
    boolean revalidate(List<String> paths);

    /** False when no revalidate URL is configured (the call becomes a logged no-op). */
    boolean enabled();
}
