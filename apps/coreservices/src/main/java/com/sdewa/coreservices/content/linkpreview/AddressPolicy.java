package com.sdewa.coreservices.content.linkpreview;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;

/**
 * SSRF address rules for {@code POST /admin/link-preview} (ADR-009 §5.5): only public unicast
 * addresses. Rejects loopback, private (RFC 1918 / ULA), link-local (incl. 169.254.169.254 cloud
 * metadata), CGNAT, multicast, unspecified, documentation, benchmark, reserved, and NAT64 /
 * IPv4-compatible IPv6 forms of those.
 */
public final class AddressPolicy {

    private AddressPolicy() {
    }

    public static boolean isPublic(InetAddress a) {
        if (a.isAnyLocalAddress() || a.isLoopbackAddress() || a.isLinkLocalAddress() || a.isSiteLocalAddress()
                || a.isMulticastAddress()) {
            return false;
        }
        byte[] b = a.getAddress();
        if (a instanceof Inet4Address) {
            return isPublicV4(b);
        }
        if (a instanceof Inet6Address) {
            int b0 = b[0] & 0xff;
            if ((b0 & 0xfe) == 0xfc) {
                return false; // fc00::/7 unique local
            }
            if (b0 == 0xfe && (b[1] & 0xc0) == 0xc0) {
                return false; // fec0::/10 site local (deprecated)
            }
            if (b0 == 0x20 && (b[1] & 0xff) == 0x01 && (b[2] & 0xff) == 0x0d && (b[3] & 0xff) == 0xb8) {
                return false; // 2001:db8::/32 documentation
            }
            boolean first12Zero = true;
            for (int i = 0; i < 12; i++) {
                if (b[i] != 0) {
                    first12Zero = false;
                    break;
                }
            }
            if (first12Zero) {
                return false; // ::/96 IPv4-compatible (and :: / ::1 handled above)
            }
            // 64:ff9b::/96 NAT64 → check the embedded IPv4
            if (b0 == 0x00 && (b[1] & 0xff) == 0x64 && (b[2] & 0xff) == 0xff && (b[3] & 0xff) == 0x9b) {
                return isPublicV4(new byte[]{b[12], b[13], b[14], b[15]});
            }
            // ::ffff:0:0/96 mapped (Java usually returns Inet4Address for these)
            boolean mapped = true;
            for (int i = 0; i < 10; i++) {
                if (b[i] != 0) {
                    mapped = false;
                    break;
                }
            }
            if (mapped && (b[10] & 0xff) == 0xff && (b[11] & 0xff) == 0xff) {
                return isPublicV4(new byte[]{b[12], b[13], b[14], b[15]});
            }
            return true;
        }
        return false;
    }

    private static boolean isPublicV4(byte[] b) {
        int o0 = b[0] & 0xff, o1 = b[1] & 0xff, o2 = b[2] & 0xff;
        if (o0 == 0 || o0 == 10 || o0 == 127) return false;
        if (o0 == 100 && o1 >= 64 && o1 <= 127) return false;      // 100.64/10 CGNAT
        if (o0 == 169 && o1 == 254) return false;                  // link local / metadata
        if (o0 == 172 && o1 >= 16 && o1 <= 31) return false;       // 172.16/12
        if (o0 == 192 && o1 == 168) return false;                  // 192.168/16
        if (o0 == 192 && o1 == 0 && (o2 == 0 || o2 == 2)) return false; // 192.0.0/24, 192.0.2/24
        if (o0 == 198 && (o1 == 18 || o1 == 19)) return false;     // benchmark
        if (o0 == 198 && o1 == 51 && o2 == 100) return false;      // documentation
        if (o0 == 203 && o1 == 0 && o2 == 113) return false;       // documentation
        if (o0 >= 224) return false;                               // multicast, reserved, broadcast
        return true;
    }
}
