package com.sdewa.coreservices.admin;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.product.ProductAdminService;
import com.sdewa.coreservices.product.ProductDtos.AdminPlan;
import com.sdewa.coreservices.product.ProductDtos.AdminProduct;
import com.sdewa.coreservices.product.ProductDtos.IssuedCredentialView;
import com.sdewa.coreservices.product.ProductDtos.PlanInput;
import com.sdewa.coreservices.product.ProductDtos.ProductCreateRequest;
import com.sdewa.coreservices.product.ProductDtos.RedirectUriInput;
import com.sdewa.coreservices.product.ProductDtos.RedirectUriView;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.UUID;

/** Admin 6.7 — Products & plans (UC-21), plus SSO redirect URIs. */
@RestController
@RequestMapping("/admin")
public class AdminProductController {

    private final ProductAdminService products;

    public AdminProductController(ProductAdminService products) {
        this.products = products;
    }

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<AdminProduct>>> list() {
        return Responses.ok(products.list(), Responses.MSG_LIST);
    }

    @PostMapping("/products")
    public ResponseEntity<ApiResponse<AdminProduct>> create(@Valid @RequestBody ProductCreateRequest request) {
        return Responses.created(products.create(request));
    }

    @GetMapping("/products/{id}")
    public ResponseEntity<ApiResponse<AdminProduct>> get(@PathVariable UUID id) {
        return Responses.ok(products.get(id));
    }

    @PatchMapping("/products/{id}")
    public ResponseEntity<ApiResponse<AdminProduct>> patch(@PathVariable UUID id, @RequestBody JsonNode body) {
        return Responses.ok(products.patch(id, body), Responses.MSG_UPDATED);
    }

    @PostMapping("/products/{id}/credentials")
    public ResponseEntity<ApiResponse<IssuedCredentialView>> createCredential(@PathVariable UUID id) {
        return Responses.created(products.createCredential(id));
    }

    @DeleteMapping("/products/{id}/credentials/{clientId}")
    public ResponseEntity<Void> revokeCredential(@PathVariable UUID id, @PathVariable String clientId) {
        products.revokeCredential(id, clientId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/products/{id}/plans")
    public ResponseEntity<ApiResponse<AdminPlan>> createPlan(@PathVariable UUID id, @Valid @RequestBody PlanInput input) {
        return Responses.created(products.createPlan(id, input));
    }

    @PatchMapping("/plans/{id}")
    public ResponseEntity<ApiResponse<AdminPlan>> patchPlan(@PathVariable UUID id, @RequestBody JsonNode body) {
        return Responses.ok(products.patchPlan(id, body), Responses.MSG_UPDATED);
    }

    @PostMapping("/products/{id}/redirect-uris")
    public ResponseEntity<ApiResponse<RedirectUriView>> addRedirectUri(@PathVariable UUID id, @Valid @RequestBody RedirectUriInput input) {
        return Responses.created(products.addRedirectUri(id, input.uri()));
    }

    @DeleteMapping("/products/{id}/redirect-uris/{redirectUriId}")
    public ResponseEntity<Void> removeRedirectUri(@PathVariable UUID id, @PathVariable UUID redirectUriId) {
        products.removeRedirectUri(id, redirectUriId);
        return ResponseEntity.noContent().build();
    }
}
