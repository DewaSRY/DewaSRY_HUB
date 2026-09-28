package com.sdewa.coreservices.payment.midtrans;

import com.sdewa.coreservices.config.HubProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Real Midtrans Snap + Status API through Spring {@link RestClient} (ADR-001 §5.3). */
@Component
@ConditionalOnProperty(prefix = "hub.midtrans", name = "mode", havingValue = "live")
public class HttpMidtransGateway implements MidtransGateway {

    private static final Logger log = LoggerFactory.getLogger(HttpMidtransGateway.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP = new ParameterizedTypeReference<>() {
    };

    private final RestClient snap;
    private final RestClient api;

    public HttpMidtransGateway(HubProperties properties, RestClient.Builder builder) {
        HubProperties.Midtrans m = properties.getMidtrans();
        if (m.getServerKey() == null || m.getServerKey().isBlank()) {
            throw new IllegalStateException("hub.midtrans.server-key must be set when hub.midtrans.mode=live");
        }
        String auth = "Basic " + Base64.getEncoder().encodeToString((m.getServerKey() + ":").getBytes(StandardCharsets.UTF_8));
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(m.getTimeout());
        factory.setReadTimeout(m.getTimeout());
        this.snap = builder.clone().requestFactory(factory).baseUrl(m.resolvedSnapBaseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, auth)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE).build();
        this.api = builder.clone().requestFactory(factory).baseUrl(m.resolvedApiBaseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, auth)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE).build();
    }

    @Override
    public SnapResult createSnapTransaction(SnapRequest r) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("transaction_details", Map.of("order_id", r.orderId(), "gross_amount", r.grossAmount()));
        body.put("item_details", List.of(Map.of("id", r.itemId(), "price", r.grossAmount(), "quantity", 1,
                "name", truncate(r.itemName(), 50))));
        Map<String, Object> customer = new LinkedHashMap<>();
        if (r.customerEmail() != null && !r.customerEmail().isBlank()) {
            customer.put("email", r.customerEmail());
        }
        if (r.customerName() != null) {
            customer.put("first_name", truncate(r.customerName(), 50));
        }
        body.put("customer_details", customer);
        body.put("expiry", Map.of("unit", "minute", "duration", r.expiryMinutes()));
        try {
            Map<String, Object> res = snap.post().uri("/snap/v1/transactions").contentType(MediaType.APPLICATION_JSON)
                    .body(body).retrieve().body(MAP);
            if (res == null || res.get("token") == null) {
                throw new MidtransException("Snap response has no token");
            }
            return new SnapResult(String.valueOf(res.get("token")), String.valueOf(res.get("redirect_url")));
        } catch (RestClientException e) {
            log.warn("Midtrans Snap call failed for {}: {}", r.orderId(), e.getMessage());
            throw new MidtransException("Snap call failed", e);
        }
    }

    @Override
    public MidtransStatus fetchStatus(String orderId) {
        try {
            Map<String, Object> res = api.get().uri("/v2/{orderId}/status", orderId).retrieve()
                    .onStatus(s -> s.value() == 404, (req, resp) -> {
                    })
                    .body(MAP);
            if (res == null) {
                throw new MidtransException("Empty status response");
            }
            return new MidtransStatus(res);
        } catch (RestClientException e) {
            log.warn("Midtrans Status call failed for {}: {}", orderId, e.getMessage());
            throw new MidtransException("Status call failed", e);
        }
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
