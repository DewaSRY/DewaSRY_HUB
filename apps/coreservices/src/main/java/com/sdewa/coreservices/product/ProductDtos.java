package com.sdewa.coreservices.product;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.sdewa.coreservices.common.api.Money;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Product and plan shapes (ADR-003 §5.2, §10.7). */
public final class ProductDtos {

    private ProductDtos() {
    }

    public record PublicPlan(UUID id, String code, String name, Money price, BillingPeriod billingPeriod, JsonNode features) {
    }

    public record PublicProduct(String code, String name, String description, String websiteUrl, List<PublicPlan> plans) {
    }

    public record AdminPlan(UUID id, String code, String name, Money price, BillingPeriod billingPeriod, JsonNode features,
                            @JsonProperty("public") boolean isPublic, boolean active, boolean sold,
                            long activeSubscriptions, Instant createdAt) {
    }

    public record CredentialSummary(String clientId, Instant createdAt, Instant lastUsedAt) {
    }

    public record RedirectUriView(UUID id, String uri, Instant createdAt) {
    }

    public record IssuedCredentialView(String clientId, String clientSecret, Instant createdAt) {
    }

    public record AdminProduct(UUID id, String code, String name, String description, String websiteUrl, boolean active,
                               int planCount, List<AdminPlan> plans, List<CredentialSummary> credentials,
                               List<RedirectUriView> redirectUris, long memberCount, Instant createdAt,
                               @JsonInclude(JsonInclude.Include.NON_NULL) IssuedCredentialView credential) {
        public AdminProduct withCredential(IssuedCredentialView c) {
            return new AdminProduct(id, code, name, description, websiteUrl, active, planCount, plans, credentials,
                    redirectUris, memberCount, createdAt, c);
        }
    }

    public record ProductCreateRequest(
            @NotBlank @Size(max = 64) @Pattern(regexp = "^[a-z0-9-]+$", message = "Must use lowercase a-z, 0-9 and '-'.") String code,
            @NotBlank @Size(max = 120) String name,
            @Size(max = 5000) String description,
            @Size(max = 2000) String websiteUrl,
            Boolean active) {
    }

    public record MoneyInput(@NotNull @PositiveOrZero Long amount, @NotBlank String currency) {
    }

    public record PlanInput(
            @NotBlank @Size(max = 64) @Pattern(regexp = "^[a-z0-9-]+$", message = "Must use lowercase a-z, 0-9 and '-'.") String code,
            @NotBlank @Size(max = 120) String name,
            @NotNull @Valid MoneyInput price,
            BillingPeriod billingPeriod,
            JsonNode features,
            @JsonProperty("public") Boolean isPublic,
            Boolean active) {
    }

    public record RedirectUriInput(@NotBlank @Size(max = 2000) String uri) {
    }
}
