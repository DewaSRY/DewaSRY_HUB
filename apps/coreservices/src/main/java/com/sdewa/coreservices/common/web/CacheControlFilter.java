package com.sdewa.coreservices.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Default {@code Cache-Control} per ADR-003 §3.6: public reads are cacheable for 60 s (plus an
 * ETag from {@link org.springframework.web.filter.ShallowEtagHeaderFilter}); everything else is
 * {@code no-store}. Controllers can override it (the entitlement endpoint sends
 * {@code private, max-age=300}), and error responses always send {@code no-store}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class CacheControlFilter extends OncePerRequestFilter {

    public static final String PUBLIC_CACHE = "public, max-age=60, stale-while-revalidate=600";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (path.startsWith("/v1/public/") && "GET".equals(request.getMethod())) {
            response.setHeader("Cache-Control", PUBLIC_CACHE);
        } else if (path.startsWith("/local-media/")) {
            response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
            response.setHeader("Cache-Control", "no-store");
        }
        chain.doFilter(request, response);
    }
}
