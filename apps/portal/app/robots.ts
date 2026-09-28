import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/metadata";

/** Public pages are indexed; portal, admin, checkout, SSO, and sign-out are not (ADR-008 §8 SEO). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/account", "/*/checkout", "/*/admin", "/*/sso", "/*/logout"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
