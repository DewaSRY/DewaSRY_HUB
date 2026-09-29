package com.sdewa.coreservices.security;

import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.error.ErrorResponseWriter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/** 401 / 403 in the error envelope (ADR-003 rules A1, A2). */
@Component
public class JsonAuthHandlers implements AuthenticationEntryPoint, AccessDeniedHandler {

    private static final Logger log = LoggerFactory.getLogger(JsonAuthHandlers.class);

    private final ErrorResponseWriter writer;

    public JsonAuthHandlers(ErrorResponseWriter writer) {
        this.writer = writer;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException ex) throws IOException {
        log.warn("401 {} {}: {}", request.getMethod(), request.getRequestURI(), ex.getMessage());
        response.setHeader("WWW-Authenticate", "Bearer");
        writer.write(response, ErrorReason.UNAUTHENTICATED);
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException ex) throws IOException {
        log.warn("403 {} {}: {}", request.getMethod(), request.getRequestURI(), ex.getMessage());
        writer.write(response, ErrorReason.FORBIDDEN);
    }
}
