package com.sdewa.coreservices.product;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.product.ProductDtos.PublicProduct;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Group 1 product endpoints (ADR-003 §5.2). */
@RestController
@RequestMapping("/public/products")
public class PublicProductController {

    private final ProductCatalogService catalog;

    public PublicProductController(ProductCatalogService catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PublicProduct>>> list() {
        return Responses.ok(catalog.listActive(), Responses.MSG_LIST);
    }

    @GetMapping("/{productCode}")
    public ResponseEntity<ApiResponse<PublicProduct>> get(@PathVariable String productCode) {
        return Responses.ok(catalog.getActive(productCode));
    }
}
