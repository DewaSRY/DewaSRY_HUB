package com.sdewa.coreservices.common.error;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/** Writes the error envelope directly to the servlet response (used by filters and security). */
@Component
public class ErrorResponseWriter {

    private final JsonMapper jsonMapper;

    public ErrorResponseWriter(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    public void write(HttpServletResponse response, ErrorReason reason) throws IOException {
        write(response, reason, reason.message(), List.of());
    }

    public void write(HttpServletResponse response, ErrorReason reason, String message, List<FieldErrorItem> errors)
            throws IOException {
        if (response.isCommitted()) {
            return;
        }
        response.setStatus(reason.status().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setHeader("Cache-Control", "no-store");
        ErrorResponse body = new ErrorResponse(reason.status().value(), message, errors);
        response.getWriter().write(jsonMapper.writeValueAsString(body));
        response.getWriter().flush();
    }
}
