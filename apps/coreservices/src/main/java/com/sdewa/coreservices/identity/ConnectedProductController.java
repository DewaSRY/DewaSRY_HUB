package com.sdewa.coreservices.identity;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.identity.IdentityDtos.Membership;
import com.sdewa.coreservices.identity.IdentityDtos.ProductUser;
import com.sdewa.coreservices.product.AuthenticatedClient;
import com.sdewa.coreservices.security.HubAuthentication;
import com.sdewa.coreservices.security.ProductClientFilter;
import com.sdewa.coreservices.subscription.EntitlementService;
import com.sdewa.coreservices.subscription.SubscriptionDtos.Entitlement;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Group 4 — {@code POST /products/{productCode}/members} (UC-06, ADR-003 §8.3). */
@RestController
@RequestMapping("/products/{productCode}")
public class ConnectedProductController {

    private final UserService users;
    private final EntitlementService entitlements;
    private final TransactionTemplate tx;

    public ConnectedProductController(UserService users, EntitlementService entitlements, TransactionTemplate tx) {
        this.users = users;
        this.entitlements = entitlements;
        this.tx = tx;
    }

    public record MemberResponse(ProductUser user, Membership membership, Entitlement entitlement) {
    }

    @PostMapping("/members")
    public ResponseEntity<ApiResponse<MemberResponse>> join(@PathVariable String productCode, HubAuthentication auth,
                                                            HttpServletRequest request) {
        AuthenticatedClient client = (AuthenticatedClient) request.getAttribute(ProductClientFilter.ATTRIBUTE);
        boolean created = Boolean.TRUE.equals(tx.execute(s -> {
            users.recordSignIn(auth.userId(), auth.identity());
            return users.joinProduct(auth.userId(), client.productId());
        }));
        User user = users.get(auth.userId());
        MemberResponse body = new MemberResponse(ProductUser.of(user),
                new Membership(client.productCode(), users.joinedAt(auth.userId(), client.productId())),
                entitlements.forUser(auth.userId(), client.productId()));
        return created ? Responses.status(HttpStatus.CREATED, body, "Joined product") : Responses.ok(body);
    }
}
