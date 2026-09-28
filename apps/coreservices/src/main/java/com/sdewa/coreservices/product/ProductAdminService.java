package com.sdewa.coreservices.product;

import com.sdewa.coreservices.common.api.Money;
import com.sdewa.coreservices.common.api.PatchBody;
import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.error.FieldErrorItem;
import com.sdewa.coreservices.common.util.JsonText;
import com.sdewa.coreservices.common.util.Texts;
import com.sdewa.coreservices.config.HubProperties;
import com.sdewa.coreservices.product.ProductDtos.AdminPlan;
import com.sdewa.coreservices.product.ProductDtos.AdminProduct;
import com.sdewa.coreservices.product.ProductDtos.CredentialSummary;
import com.sdewa.coreservices.product.ProductDtos.IssuedCredentialView;
import com.sdewa.coreservices.product.ProductDtos.PlanInput;
import com.sdewa.coreservices.product.ProductDtos.ProductCreateRequest;
import com.sdewa.coreservices.product.ProductDtos.RedirectUriView;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Products, plans, client credentials, and SSO redirect URIs for the admin (UC-21). */
@Service
@Transactional
public class ProductAdminService {

    public static final int MAX_ACTIVE_CREDENTIALS = 2;
    private static final int MAX_FEATURES_BYTES = 8 * 1024;

    private final ProductRepository products;
    private final PlanRepository plans;
    private final ProductCredentialRepository credentials;
    private final ProductRedirectUriRepository redirectUris;
    private final ProductCredentialService credentialService;
    private final JdbcTemplate jdbc;
    private final JsonText json;
    private final HubProperties properties;

    public ProductAdminService(ProductRepository products, PlanRepository plans, ProductCredentialRepository credentials,
                               ProductRedirectUriRepository redirectUris, ProductCredentialService credentialService,
                               JdbcTemplate jdbc, JsonText json, HubProperties properties) {
        this.products = products;
        this.plans = plans;
        this.credentials = credentials;
        this.redirectUris = redirectUris;
        this.credentialService = credentialService;
        this.jdbc = jdbc;
        this.json = json;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public List<AdminProduct> list() {
        return products.findAllByOrderByCreatedAtAsc().stream().map(this::toAdmin).toList();
    }

    @Transactional(readOnly = true)
    public AdminProduct get(UUID id) {
        return toAdmin(products.findById(id).orElseThrow(ApiException::notFound));
    }

    public AdminProduct create(ProductCreateRequest request) {
        if (products.existsByCode(request.code())) {
            throw new ApiException(ErrorReason.CODE_TAKEN);
        }
        validateWebsiteUrl(request.websiteUrl(), "websiteUrl");
        Product product = new Product();
        product.setCode(request.code());
        product.setName(request.name().trim());
        product.setDescription(Texts.trimToNull(request.description()));
        product.setWebsiteUrl(Texts.trimToNull(request.websiteUrl()));
        product.setActive(request.active() == null || request.active());
        products.saveAndFlush(product);
        ProductCredentialService.IssuedCredential issued = credentialService.issue(product);
        return toAdmin(product).withCredential(new IssuedCredentialView(issued.clientId(), issued.clientSecret(), issued.createdAt()));
    }

    public AdminProduct patch(UUID id, JsonNode body) {
        Product product = products.findById(id).orElseThrow(ApiException::notFound);
        PatchBody patch = PatchBody.of(body, Set.of("name", "description", "websiteUrl", "active"));
        if (patch.has("name")) {
            String name = Texts.trimToNull(patch.string("name"));
            if (name == null || name.length() > 120) {
                patch.error("name", "Must be between 1 and 120 characters.");
            } else {
                product.setName(name);
            }
        }
        if (patch.has("description")) {
            String d = Texts.trimToNull(patch.string("description"));
            if (d != null && d.length() > 5000) {
                patch.error("description", "Must be at most 5000 characters.");
            }
            product.setDescription(d);
        }
        if (patch.has("websiteUrl")) {
            String url = Texts.trimToNull(patch.string("websiteUrl"));
            if (url != null && !isHttpUrl(url)) {
                patch.error("websiteUrl", "Must be an http(s) URL.");
            }
            product.setWebsiteUrl(url);
        }
        if (patch.has("active")) {
            Boolean active = patch.bool("active");
            if (active != null) {
                product.setActive(active);
            }
        }
        patch.throwIfInvalid();
        products.flush();
        return toAdmin(product);
    }

    public IssuedCredentialView createCredential(UUID productId) {
        Product product = products.findByIdForUpdate(productId).orElseThrow(ApiException::notFound);
        if (credentials.countByProductIdAndRevokedAtIsNull(productId) >= MAX_ACTIVE_CREDENTIALS) {
            throw new ApiException(ErrorReason.CREDENTIAL_LIMIT);
        }
        ProductCredentialService.IssuedCredential issued = credentialService.issue(product);
        return new IssuedCredentialView(issued.clientId(), issued.clientSecret(), issued.createdAt());
    }

    public void revokeCredential(UUID productId, String clientId) {
        products.findByIdForUpdate(productId).orElseThrow(ApiException::notFound);
        ProductCredential credential = credentials.findByProductIdAndClientIdAndRevokedAtIsNull(productId, clientId)
                .orElseThrow(ApiException::notFound);
        if (credentials.countByProductIdAndRevokedAtIsNull(productId) <= 1) {
            throw new ApiException(ErrorReason.LAST_CREDENTIAL);
        }
        credential.setRevokedAt(java.time.Instant.now());
        credentials.flush();
        credentialService.forget(clientId);
    }

    public AdminPlan createPlan(UUID productId, PlanInput input) {
        Product product = products.findByIdForUpdate(productId).orElseThrow(ApiException::notFound);
        List<FieldErrorItem> errors = new ArrayList<>();
        if (!"IDR".equals(input.price().currency())) {
            errors.add(new FieldErrorItem("price.currency", "Only IDR is supported."));
        }
        checkPeriod(input.price().amount(), input.billingPeriod(), errors);
        String features = featuresText(input.features(), errors);
        if (!errors.isEmpty()) {
            throw new ApiException(ErrorReason.VALIDATION_FAILED, errors);
        }
        if (plans.existsByCode(input.code())) {
            throw new ApiException(ErrorReason.CODE_TAKEN);
        }
        boolean active = input.active() == null || input.active();
        if (input.price().amount() == 0 && active && plans.findAllByProductIdOrderByPriceAmountAscCreatedAtAsc(productId)
                .stream().anyMatch(p -> p.isFree() && p.isActive())) {
            throw new ApiException(ErrorReason.FREE_PLAN_EXISTS);
        }
        Plan plan = new Plan();
        plan.setProduct(product);
        plan.setCode(input.code());
        plan.setName(input.name().trim());
        plan.setPriceAmount(input.price().amount());
        plan.setCurrency("IDR");
        plan.setBillingPeriod(input.price().amount() == 0 ? null : input.billingPeriod());
        plan.setFeatures(features);
        plan.setPublic(input.isPublic() == null || input.isPublic());
        plan.setActive(active);
        plans.saveAndFlush(plan);
        return toAdminPlan(plan);
    }

    public AdminPlan patchPlan(UUID planId, JsonNode body) {
        Plan plan = plans.findById(planId).orElseThrow(ApiException::notFound);
        products.findByIdForUpdate(plan.getProduct().getId());
        PatchBody patch = PatchBody.of(body, Set.of("name", "features", "public", "active", "price", "billingPeriod"));
        List<FieldErrorItem> errors = patch.errors();
        boolean priceChange = false;
        long amount = plan.getPriceAmount();
        BillingPeriod period = plan.getBillingPeriod();
        if (patch.has("price")) {
            JsonNode price = patch.raw("price");
            if (price == null || !price.isObject() || !price.path("amount").canConvertToLong() || !price.path("amount").isIntegralNumber()
                    || price.path("amount").asLong() < 0) {
                errors.add(new FieldErrorItem("price.amount", "Must be an integer of 0 or more."));
            } else if (!"IDR".equals(price.path("currency").asString("IDR"))) {
                errors.add(new FieldErrorItem("price.currency", "Only IDR is supported."));
            } else {
                priceChange |= price.path("amount").asLong() != plan.getPriceAmount();
                amount = price.path("amount").asLong();
            }
        }
        if (patch.has("billingPeriod")) {
            JsonNode bp = patch.raw("billingPeriod");
            if (bp == null || bp.isNull()) {
                priceChange |= period != null;
                period = null;
            } else if (bp.isString() && (bp.stringValue().equals("MONTHLY") || bp.stringValue().equals("YEARLY"))) {
                BillingPeriod next = BillingPeriod.valueOf(bp.stringValue());
                priceChange |= next != period;
                period = next;
            } else {
                errors.add(new FieldErrorItem("billingPeriod", "Must be MONTHLY, YEARLY, or null."));
            }
        }
        if (patch.has("name")) {
            String name = Texts.trimToNull(patch.string("name"));
            if (name == null || name.length() > 120) {
                errors.add(new FieldErrorItem("name", "Must be between 1 and 120 characters."));
            } else {
                plan.setName(name);
            }
        }
        if (patch.has("features")) {
            plan.setFeatures(featuresText(patch.raw("features"), errors));
        }
        if (patch.has("public")) {
            Boolean v = patch.bool("public");
            if (v != null) {
                plan.setPublic(v);
            }
        }
        if (patch.has("active")) {
            Boolean v = patch.bool("active");
            if (v != null) {
                plan.setActive(v);
            }
        }
        checkPeriod(amount, period, errors);
        patch.throwIfInvalid();
        if (priceChange && isSold(plan.getId())) {
            throw new ApiException(ErrorReason.PLAN_SOLD);
        }
        plan.setPriceAmount(amount);
        plan.setBillingPeriod(period);
        if (plan.isFree() && plan.isActive() && plans.findAllByProductIdOrderByPriceAmountAscCreatedAtAsc(plan.getProduct().getId())
                .stream().anyMatch(p -> !p.getId().equals(plan.getId()) && p.isFree() && p.isActive())) {
            throw new ApiException(ErrorReason.FREE_PLAN_EXISTS);
        }
        plans.flush();
        return toAdminPlan(plan);
    }

    public RedirectUriView addRedirectUri(UUID productId, String uri) {
        Product product = products.findByIdForUpdate(productId).orElseThrow(ApiException::notFound);
        String value = uri.trim();
        String problem = redirectUriProblem(value);
        if (problem != null) {
            throw ApiException.validation("uri", problem);
        }
        if (redirectUris.existsByProductIdAndUri(productId, value)) {
            throw new ApiException(ErrorReason.CONFLICT, "The redirect URI is already registered");
        }
        ProductRedirectUri row = new ProductRedirectUri();
        row.setProduct(product);
        row.setUri(value);
        redirectUris.saveAndFlush(row);
        return new RedirectUriView(row.getId(), row.getUri(), row.getCreatedAt());
    }

    public void removeRedirectUri(UUID productId, UUID redirectUriId) {
        ProductRedirectUri row = redirectUris.findById(redirectUriId)
                .filter(r -> r.getProduct().getId().equals(productId))
                .orElseThrow(ApiException::notFound);
        redirectUris.delete(row);
    }

    /** Redirect URI rules (ADR-001 §5.7): absolute, HTTPS (or http://localhost in dev), no fragment, no wildcard. */
    public String redirectUriProblem(String value) {
        URI parsed;
        try {
            parsed = new URI(value);
        } catch (Exception e) {
            return "Must be an absolute URI.";
        }
        if (!parsed.isAbsolute() || parsed.getHost() == null) {
            return "Must be an absolute URI.";
        }
        if (parsed.getFragment() != null || value.contains("*")) {
            return "Must not contain a fragment or wildcard.";
        }
        String scheme = parsed.getScheme().toLowerCase();
        boolean localhost = "localhost".equalsIgnoreCase(parsed.getHost()) || "127.0.0.1".equals(parsed.getHost());
        if ("https".equals(scheme)) {
            return null;
        }
        if ("http".equals(scheme) && localhost && properties.getSso().isAllowLocalhostRedirects()) {
            return null;
        }
        return "Must use https.";
    }

    public boolean isSold(UUID planId) {
        Boolean sold = jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM transactions WHERE plan_id = ? AND status IN ('PAID','REFUNDED'))",
                Boolean.class, planId);
        return Boolean.TRUE.equals(sold);
    }

    AdminProduct toAdmin(Product product) {
        List<AdminPlan> productPlans = plans.findAllByProductIdOrderByPriceAmountAscCreatedAtAsc(product.getId())
                .stream().map(this::toAdminPlan).toList();
        List<CredentialSummary> creds = credentials.findAllByProductIdAndRevokedAtIsNullOrderByCreatedAtAsc(product.getId())
                .stream().map(c -> new CredentialSummary(c.getClientId(), c.getCreatedAt(), c.getLastUsedAt())).toList();
        List<RedirectUriView> uris = redirectUris.findAllByProductIdOrderByCreatedAtAsc(product.getId())
                .stream().map(r -> new RedirectUriView(r.getId(), r.getUri(), r.getCreatedAt())).toList();
        Long members = jdbc.queryForObject("SELECT count(*) FROM user_products WHERE product_id = ?", Long.class, product.getId());
        return new AdminProduct(product.getId(), product.getCode(), product.getName(), product.getDescription(),
                product.getWebsiteUrl(), product.isActive(), productPlans.size(), productPlans, creds, uris,
                members == null ? 0 : members, product.getCreatedAt(), null);
    }

    AdminPlan toAdminPlan(Plan plan) {
        Long activeSubs = jdbc.queryForObject(
                "SELECT count(*) FROM subscriptions WHERE plan_id = ? AND status = 'ACTIVE' AND end_date > now()",
                Long.class, plan.getId());
        return new AdminPlan(plan.getId(), plan.getCode(), plan.getName(), Money.idr(plan.getPriceAmount()),
                plan.getBillingPeriod(), json.parse(plan.getFeatures()), plan.isPublic(), plan.isActive(),
                isSold(plan.getId()), activeSubs == null ? 0 : activeSubs, plan.getCreatedAt());
    }

    private String featuresText(JsonNode features, List<FieldErrorItem> errors) {
        if (features == null || features.isNull()) {
            return "{}";
        }
        if (!features.isObject()) {
            errors.add(new FieldErrorItem("features", "Must be a JSON object."));
            return "{}";
        }
        String text = json.write(features);
        if (text.getBytes(StandardCharsets.UTF_8).length > MAX_FEATURES_BYTES) {
            errors.add(new FieldErrorItem("features", "Must be at most 8 KB."));
        }
        return text;
    }

    private static void checkPeriod(long amount, BillingPeriod period, List<FieldErrorItem> errors) {
        if (amount == 0 && period != null) {
            errors.add(new FieldErrorItem("billingPeriod", "Must be null for a free plan."));
        }
        if (amount > 0 && period == null) {
            errors.add(new FieldErrorItem("billingPeriod", "Is required for a paid plan (MONTHLY or YEARLY)."));
        }
    }

    private static void validateWebsiteUrl(String url, String field) {
        if (url != null && !url.isBlank() && !isHttpUrl(url.trim())) {
            throw ApiException.validation(field, "Must be an http(s) URL.");
        }
    }

    private static boolean isHttpUrl(String url) {
        try {
            URI u = new URI(url);
            return u.getHost() != null && ("https".equalsIgnoreCase(u.getScheme()) || "http".equalsIgnoreCase(u.getScheme()));
        } catch (Exception e) {
            return false;
        }
    }
}
