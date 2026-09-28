package com.sdewa.coreservices.payment;

import com.sdewa.coreservices.config.HubProperties;
import com.sdewa.coreservices.payment.midtrans.FakeMidtransGateway;
import com.sdewa.coreservices.payment.midtrans.MidtransSignature;
import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.Responses;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Local-only helper: simulates a Midtrans payment. It sets the fake Status API answer and then
 * runs the real webhook handler with a correctly signed notification.
 */
@RestController
@RequestMapping("/dev/midtrans")
@Profile("local")
@ConditionalOnBean(FakeMidtransGateway.class)
public class DevMidtransController {

    private final FakeMidtransGateway fake;
    private final MidtransWebhookController webhook;
    private final HubProperties properties;

    public DevMidtransController(FakeMidtransGateway fake, MidtransWebhookController webhook, HubProperties properties) {
        this.fake = fake;
        this.webhook = webhook;
        this.properties = properties;
    }

    public record SimulateRequest(@NotBlank String orderId, @NotBlank String transactionStatus, String fraudStatus,
                                  String paymentType, Long grossAmount) {
    }

    @PostMapping("/simulate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> simulate(@Valid @RequestBody SimulateRequest r) {
        Map<String, Object> status = fake.setStatus(r.orderId(), r.transactionStatus(), r.fraudStatus(), r.paymentType(), r.grossAmount());
        Map<String, Object> notification = new LinkedHashMap<>(status);
        notification.put("signature_key", MidtransSignature.compute(r.orderId(), String.valueOf(status.get("status_code")),
                String.valueOf(status.get("gross_amount")), properties.getMidtrans().getServerKey()));
        var res = webhook.notification(notification);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("webhookStatus", res.getStatusCode().value());
        out.put("notification", notification);
        return Responses.ok(out);
    }
}
