package com.sdewa.coreservices.subscription;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.product.AuthenticatedClient;
import com.sdewa.coreservices.security.HubAuthentication;
import com.sdewa.coreservices.security.ProductClientFilter;
import com.sdewa.coreservices.subscription.SubscriptionDtos.Entitlement;
import com.sdewa.coreservices.subscription.SubscriptionDtos.SubscriptionView;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** {@code GET /me/subscriptions} (UC-10) and {@code GET /products/{code}/entitlements/me} (UC-07). */
@RestController
public class SubscriptionControllers {

    private final SubscriptionService subscriptions;
    private final EntitlementService entitlements;

    public SubscriptionControllers(SubscriptionService subscriptions, EntitlementService entitlements) {
        this.subscriptions = subscriptions;
        this.entitlements = entitlements;
    }

    @GetMapping("/me/subscriptions")
    public ResponseEntity<ApiResponse<List<SubscriptionView>>> mine(HubAuthentication auth) {
        return Responses.ok(subscriptions.listForUser(auth.userId()), Responses.MSG_LIST);
    }

    @GetMapping("/products/{productCode}/entitlements/me")
    public ResponseEntity<ApiResponse<Entitlement>> entitlement(@PathVariable String productCode, HubAuthentication auth,
                                                                HttpServletRequest request) {
        AuthenticatedClient client = (AuthenticatedClient) request.getAttribute(ProductClientFilter.ATTRIBUTE);
        Entitlement e = entitlements.forUser(auth.userId(), client.productId());
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(new ApiResponse<>(e, 200, Responses.MSG_DATA));
    }
}
