package com.sdewa.coreservices.content.revalidation;

import com.sdewa.coreservices.config.HubProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

/** {@code POST <site>/api/revalidate} with {@code X-Revalidate-Secret}. */
@Component
public class HttpRevalidationClient implements RevalidationClient {

    private static final Logger log = LoggerFactory.getLogger(HttpRevalidationClient.class);

    private final HubProperties.Revalidate config;
    private final JsonMapper mapper;
    private final HttpClient http;

    public HttpRevalidationClient(HubProperties properties, JsonMapper mapper) {
        this.config = properties.getRevalidate();
        this.mapper = mapper;
        this.http = HttpClient.newBuilder().connectTimeout(config.getTimeout()).followRedirects(HttpClient.Redirect.NEVER).build();
    }

    @Override
    public boolean enabled() {
        return config.getUrl() != null && !config.getUrl().isBlank();
    }

    @Override
    public boolean revalidate(List<String> paths) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(config.getUrl()))
                    .timeout(config.getTimeout())
                    .header("Content-Type", "application/json")
                    .header("X-Revalidate-Secret", config.getSecret() == null ? "" : config.getSecret())
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(Map.of("paths", paths))))
                    .build();
            HttpResponse<Void> response = http.send(request, HttpResponse.BodyHandlers.discarding());
            boolean ok = response.statusCode() / 100 == 2;
            if (!ok) {
                log.warn("Revalidate answered {} for {}", response.statusCode(), paths);
            }
            return ok;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            log.warn("Revalidate call failed: {}", e.toString());
            return false;
        }
    }
}
