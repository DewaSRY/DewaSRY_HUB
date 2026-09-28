package com.sdewa.coreservices.content.linkpreview;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.util.Texts;
import jakarta.annotation.PreDestroy;
import org.apache.hc.client5.http.DnsResolver;
import org.apache.hc.client5.http.SystemDefaultDnsResolver;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.http.ClassicHttpResponse;
import org.apache.hc.core5.http.Header;
import org.apache.hc.core5.http.HttpEntity;
import org.apache.hc.core5.util.Timeout;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;

/**
 * {@code POST /admin/link-preview} (ADR-009 §5.5). SSRF guards: HTTPS only; DNS is resolved by a
 * resolver that rejects private, loopback and link-local addresses, and the connection is made to
 * the address that was checked (no DNS-rebinding window); the check repeats on every redirect; at
 * most 3 redirects, 3 s timeouts, and 1 MB read. Only {@code <title>} and {@code og:} /
 * {@code twitter:} meta tags are read.
 */
@Service
public class LinkPreviewService {

    private static final Logger log = LoggerFactory.getLogger(LinkPreviewService.class);
    private static final int MAX_REDIRECTS = 3;
    private static final int MAX_BYTES = 1024 * 1024;
    private static final long DEADLINE_MILLIS = 3_000;

    public record LinkPreview(String url, String title, String description, String siteName) {
    }

    private final DnsResolver safeResolver = new DnsResolver() {
        @Override
        public InetAddress[] resolve(String host) throws UnknownHostException {
            InetAddress[] all = SystemDefaultDnsResolver.INSTANCE.resolve(host);
            InetAddress[] allowed = Arrays.stream(all).filter(AddressPolicy::isPublic).toArray(InetAddress[]::new);
            if (allowed.length == 0 || allowed.length != all.length) {
                throw new BlockedAddressException(host);
            }
            return allowed;
        }

        @Override
        public String resolveCanonicalHostname(String host) throws UnknownHostException {
            return SystemDefaultDnsResolver.INSTANCE.resolveCanonicalHostname(host);
        }
    };

    private final CloseableHttpClient client;

    public LinkPreviewService() {
        PoolingHttpClientConnectionManager cm = PoolingHttpClientConnectionManagerBuilder.create()
                .setDnsResolver(safeResolver)
                .setDefaultConnectionConfig(ConnectionConfig.custom()
                        .setConnectTimeout(Timeout.ofSeconds(3))
                        .setSocketTimeout(Timeout.ofSeconds(3))
                        .build())
                .setMaxConnTotal(10)
                .build();
        this.client = HttpClients.custom()
                .setConnectionManager(cm)
                .disableRedirectHandling()
                .disableCookieManagement()
                .disableAuthCaching()
                .setUserAgent("DewaSuryaHub-LinkPreview/1.0")
                .setDefaultRequestConfig(RequestConfig.custom().setResponseTimeout(Timeout.ofSeconds(3)).build())
                .build();
    }

    static final class BlockedAddressException extends UnknownHostException {
        BlockedAddressException(String host) {
            super("Blocked address for " + host);
        }
    }

    public LinkPreview preview(String rawUrl) {
        URI uri = checkUrl(rawUrl);
        long deadline = System.currentTimeMillis() + DEADLINE_MILLIS;
        for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
            preResolve(uri.getHost());
            HttpGet get = new HttpGet(uri);
            get.setHeader("Accept", "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1");
            try {
                Result result = client.execute(get, response -> handle(response, deadline));
                if (result.redirect == null) {
                    return parse(rawUrl, uri, result.html, result.charset);
                }
                uri = checkUrl(uri.resolve(result.redirect).toString());
            } catch (BlockedAddressException e) {
                throw new ApiException(ErrorReason.URL_NOT_ALLOWED, "The URL resolves to a private or reserved address");
            } catch (ApiException e) {
                throw e;
            } catch (IOException | RuntimeException e) {
                log.info("Link preview fetch failed for {}: {}", uri.getHost(), e.toString());
                throw new ApiException(ErrorReason.UPSTREAM_ERROR, "The page could not be fetched");
            }
        }
        throw new ApiException(ErrorReason.UPSTREAM_ERROR, "Too many redirects");
    }

    private record Result(String redirect, byte[] html, Charset charset) {
    }

    private Result handle(ClassicHttpResponse response, long deadline) throws IOException {
        int code = response.getCode();
        if (code >= 300 && code < 400) {
            Header location = response.getFirstHeader("Location");
            if (location == null) {
                throw new IOException("Redirect without Location");
            }
            return new Result(location.getValue(), null, null);
        }
        if (code != 200) {
            throw new IOException("HTTP " + code);
        }
        HttpEntity entity = response.getEntity();
        if (entity == null) {
            throw new IOException("Empty body");
        }
        String contentType = entity.getContentType() == null ? "" : entity.getContentType().toLowerCase(Locale.ROOT);
        if (!contentType.isEmpty() && !contentType.contains("html")) {
            throw new IOException("Not HTML: " + contentType);
        }
        Charset charset = StandardCharsets.UTF_8;
        int idx = contentType.indexOf("charset=");
        if (idx >= 0) {
            try {
                charset = Charset.forName(contentType.substring(idx + 8).replace("\"", "").trim());
            } catch (RuntimeException ignored) {
                charset = StandardCharsets.UTF_8;
            }
        }
        try (InputStream in = entity.getContent()) {
            byte[] buf = new byte[8192];
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            int n;
            while (out.size() < MAX_BYTES && (n = in.read(buf, 0, Math.min(buf.length, MAX_BYTES - out.size()))) != -1) {
                out.write(buf, 0, n);
                if (System.currentTimeMillis() > deadline) {
                    throw new IOException("Deadline exceeded");
                }
            }
            return new Result(null, out.toByteArray(), charset);
        }
    }

    private LinkPreview parse(String requestedUrl, URI finalUri, byte[] html, Charset charset) {
        Document doc = Jsoup.parse(new String(html, charset), finalUri.toString());
        String title = first(meta(doc, "og:title"), meta(doc, "twitter:title"), doc.title());
        String description = first(meta(doc, "og:description"), meta(doc, "twitter:description"), meta(doc, "description"));
        String siteName = first(meta(doc, "og:site_name"), finalUri.getHost());
        return new LinkPreview(requestedUrl, Texts.truncate(title, 300), Texts.truncate(description, 1000), Texts.truncate(siteName, 200));
    }

    private static String meta(Document doc, String key) {
        Element e = doc.selectFirst("meta[property=" + key + "], meta[name=" + key + "]");
        return e == null ? null : Texts.trimToNull(e.attr("content"));
    }

    private static String first(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    /** HTTPS only, absolute, with a host; no credentials in the URL; default port or 443. */
    static URI checkUrl(String raw) {
        if (raw == null || raw.isBlank() || raw.length() > 2048) {
            throw ApiException.validation("url", "Must be an https URL.");
        }
        URI uri;
        try {
            uri = new URI(raw.trim());
        } catch (Exception e) {
            throw ApiException.validation("url", "Must be an https URL.");
        }
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getHost().isBlank()) {
            throw new ApiException(ErrorReason.URL_NOT_ALLOWED, "Only https URLs are allowed");
        }
        if (uri.getRawUserInfo() != null) {
            throw new ApiException(ErrorReason.URL_NOT_ALLOWED, "URLs with credentials are not allowed");
        }
        if (uri.getPort() != -1 && uri.getPort() != 443) {
            throw new ApiException(ErrorReason.URL_NOT_ALLOWED, "Only the default https port is allowed");
        }
        return uri;
    }

    /** Early, clear rejection; the connection-time resolver repeats the check. */
    private void preResolve(String host) {
        try {
            safeResolver.resolve(host.startsWith("[") && host.endsWith("]") ? host.substring(1, host.length() - 1) : host);
        } catch (BlockedAddressException e) {
            throw new ApiException(ErrorReason.URL_NOT_ALLOWED, "The URL resolves to a private or reserved address");
        } catch (UnknownHostException e) {
            throw new ApiException(ErrorReason.UPSTREAM_ERROR, "The host could not be resolved");
        }
    }

    @PreDestroy
    void close() throws IOException {
        client.close();
    }
}
