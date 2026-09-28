import Script from "next/script";
import { AD_CLIENT } from "./config";

/**
 * Loads the ad network script on `(site)` pages only (rule I6), after the page
 * is idle so it never competes with LCP. Renders nothing without a client id.
 */
export function AdScript() {
  if (!AD_CLIENT) return null;
  return (
    <Script
      id="ad-network"
      strategy="lazyOnload"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(AD_CLIENT)}`}
    />
  );
}
