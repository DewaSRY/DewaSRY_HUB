package com.sdewa.coreservices.security;

import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.error.ErrorResponseWriter;
import com.sdewa.coreservices.product.AuthenticatedClient;
import com.sdewa.coreservices.product.Product;
import com.sdewa.coreservices.product.ProductCredentialService;
import com.sdewa.coreservices.product.ProductRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Product auth for {@code /v1/products/{productCode}/**} (ADR-003 §8.2). Runs before the bearer
 * token filter so the check order is: client credential → 401 INVALID_CLIENT, unknown product →
 * 404, credential of another product → 403 FORBIDDEN, product inactive → 403 PRODUCT_INACTIVE,
 * then the user token → 401 UNAUTHENTICATED.
 */
public class ProductClientFilter extends OncePerRequestFilter {

    public static final String ATTRIBUTE = ProductClientFilter.class.getName() + ".client";
    private static final Pattern PATH = Pattern.compile("^/v1/products/([^/]+)(/.*)?$");

    private final ProductCredentialService credentialService;
    private final ProductRepository productRepository;
    private final ErrorResponseWriter writer;

    public ProductClientFilter(ProductCredentialService credentialService, ProductRepository productRepository,
                               ErrorResponseWriter writer) {
        this.credentialService = credentialService;
        this.productRepository = productRepository;
        this.writer = writer;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "OPTIONS".equals(request.getMethod()) || !PATH.matcher(path(request)).matches();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Matcher m = PATH.matcher(path(request));
        if (!m.matches()) {
            chain.doFilter(request, response);
            return;
        }
        String productCode = m.group(1);
        Optional<AuthenticatedClient> client = credentialService.authenticate(
                request.getHeader("X-Client-Id"), request.getHeader("X-Client-Secret"));
        if (client.isEmpty()) {
            writer.write(response, ErrorReason.INVALID_CLIENT);
            return;
        }
        Optional<Product> product = productRepository.findByCode(productCode);
        if (product.isEmpty()) {
            writer.write(response, ErrorReason.NOT_FOUND);
            return;
        }
        if (!product.get().getId().equals(client.get().productId())) {
            writer.write(response, ErrorReason.FORBIDDEN);
            return;
        }
        if (!product.get().isActive()) {
            writer.write(response, ErrorReason.PRODUCT_INACTIVE);
            return;
        }
        request.setAttribute(ATTRIBUTE, client.get());
        chain.doFilter(request, response);
    }

    private static String path(HttpServletRequest request) {
        return request.getRequestURI().substring(request.getContextPath().length());
    }
}
