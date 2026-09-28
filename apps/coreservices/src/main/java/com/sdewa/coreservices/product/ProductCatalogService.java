package com.sdewa.coreservices.product;

import com.sdewa.coreservices.common.api.Money;
import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.util.JsonText;
import com.sdewa.coreservices.product.ProductDtos.PublicPlan;
import com.sdewa.coreservices.product.ProductDtos.PublicProduct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Public product catalogue (UC-02): active products with their public, active plans. */
@Service
@Transactional(readOnly = true)
public class ProductCatalogService {

    private final ProductRepository products;
    private final PlanRepository plans;
    private final JsonText json;

    public ProductCatalogService(ProductRepository products, PlanRepository plans, JsonText json) {
        this.products = products;
        this.plans = plans;
        this.json = json;
    }

    public List<PublicProduct> listActive() {
        List<Product> active = products.findAllByActiveTrueOrderByNameAsc();
        if (active.isEmpty()) {
            return List.of();
        }
        Map<UUID, List<Plan>> byProduct = plans.findPublicActiveByProductIds(active.stream().map(Product::getId).toList())
                .stream().collect(Collectors.groupingBy(p -> p.getProduct().getId()));
        return active.stream().map(p -> toPublic(p, byProduct.getOrDefault(p.getId(), List.of()))).toList();
    }

    public PublicProduct getActive(String code) {
        Product product = products.findByCode(code).filter(Product::isActive).orElseThrow(ApiException::notFound);
        return toPublic(product, plans.findPublicActiveByProductIds(List.of(product.getId())));
    }

    public PublicPlan toPublicPlan(Plan plan) {
        return new PublicPlan(plan.getId(), plan.getCode(), plan.getName(), Money.idr(plan.getPriceAmount()),
                plan.getBillingPeriod(), json.parse(plan.getFeatures()));
    }

    private PublicProduct toPublic(Product product, List<Plan> productPlans) {
        return new PublicProduct(product.getCode(), product.getName(), product.getDescription(), product.getWebsiteUrl(),
                productPlans.stream().map(this::toPublicPlan).toList());
    }
}
