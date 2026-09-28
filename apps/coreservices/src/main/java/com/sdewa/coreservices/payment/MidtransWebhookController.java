package com.sdewa.coreservices.payment;

import com.sdewa.coreservices.config.HubProperties;
import com.sdewa.coreservices.payment.midtrans.MidtransException;
import com.sdewa.coreservices.payment.midtrans.MidtransGateway;
import com.sdewa.coreservices.payment.midtrans.MidtransSignature;
import com.sdewa.coreservices.payment.midtrans.MidtransStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * {@code POST /webhooks/midtrans} (UC-09, ADR-003 §9.1). Not enveloped: the body is always
 * {@code {"received": true}}. 403 on a bad signature, 5xx when Midtrans or the database fail (so
 * Midtrans retries), 200 otherwise.
 */
@RestController
@RequestMapping("/webhooks")
public class MidtransWebhookController {

    private static final Logger log = LoggerFactory.getLogger(MidtransWebhookController.class);
    private static final Map<String, Object> RECEIVED = Map.of("received", true);

    private final MidtransGateway gateway;
    private final PaymentStatusService statusService;
    private final HubProperties properties;

    public MidtransWebhookController(MidtransGateway gateway, PaymentStatusService statusService, HubProperties properties) {
        this.gateway = gateway;
        this.statusService = statusService;
        this.properties = properties;
    }

    @PostMapping("/midtrans")
    public ResponseEntity<Map<String, Object>> notification(@RequestBody Map<String, Object> body) {
        String orderId = str(body.get("order_id"));
        String statusCode = str(body.get("status_code"));
        String grossAmount = str(body.get("gross_amount"));
        String signature = str(body.get("signature_key"));
        if (!MidtransSignature.verify(orderId, statusCode, grossAmount, signature, properties.getMidtrans().getServerKey())) {
            log.warn("Midtrans webhook with invalid signature (order_id={})", orderId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(RECEIVED);
        }
        MidtransStatus status;
        try {
            status = gateway.fetchStatus(orderId);
        } catch (MidtransException e) {
            log.warn("Status API failed for {}; Midtrans will retry", orderId);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(RECEIVED);
        }
        try {
            statusService.apply(orderId, status, StatusSource.WEBHOOK);
        } catch (RuntimeException e) {
            log.error("Webhook processing failed for {}; Midtrans will retry", orderId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(RECEIVED);
        }
        return ResponseEntity.ok(RECEIVED);
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }
}
