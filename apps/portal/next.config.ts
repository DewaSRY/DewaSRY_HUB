import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Images are resized on upload and served from CloudFront (ADR-001 §5.2/§5.9);
  // no Next.js / Cloudflare image optimisation is used.
  images: { unoptimized: true },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;

// Lets `next dev` read Cloudflare bindings (R2/D1) through Wrangler. Only runs
// when explicitly enabled so a plain `next dev` / `next build` never needs Wrangler.
if (process.env.OPENNEXT_CLOUDFLARE_DEV === "1") {
  import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) =>
    initOpenNextCloudflareForDev(),
  );
}
