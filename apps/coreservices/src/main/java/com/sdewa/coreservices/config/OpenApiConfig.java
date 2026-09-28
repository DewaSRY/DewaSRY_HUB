package com.sdewa.coreservices.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI metadata served at {@code /v1/openapi.json} (Swagger UI in the local profile only). The
 * security requirements mirror {@code SecurityConfig}: open groups need nothing, {@code /products/**}
 * needs the product client credential plus the user token, everything else needs the user token.
 */
@Configuration
public class OpenApiConfig {

    static final String BEARER = "firebaseIdToken";
    static final String CLIENT_ID = "productClientId";
    static final String CLIENT_SECRET = "productClientSecret";

    private static final List<String> OPEN_PREFIXES = List.of(
            WebConfig.API_PREFIX + "/public/", WebConfig.API_PREFIX + "/webhooks/", WebConfig.API_PREFIX + "/dev/");
    private static final String SSO_TOKEN = WebConfig.API_PREFIX + "/sso/token";
    private static final String PRODUCTS_PREFIX = WebConfig.API_PREFIX + "/products/";

    @Bean
    public OpenAPI hubOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("DewaSRY Hub core services")
                        .version("v1")
                        .description("Hub API (ADR-003). Locally, get a bearer token from POST /v1/dev/token."))
                .components(new Components()
                        .addSecuritySchemes(BEARER, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
                                .description("Firebase ID token (HS256 dev token in local)"))
                        .addSecuritySchemes(CLIENT_ID, new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.HEADER).name("X-Client-Id"))
                        .addSecuritySchemes(CLIENT_SECRET, new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.HEADER).name("X-Client-Secret")));
    }

    @Bean
    public OpenApiCustomizer securityRequirementsCustomizer() {
        return openApi -> {
            if (openApi.getPaths() == null) {
                return;
            }
            openApi.getPaths().forEach((path, item) -> item.readOperations().forEach(op -> {
                if (op.getSecurity() != null) {
                    return; // explicit @SecurityRequirement on the handler wins
                }
                if (path.equals(SSO_TOKEN) || OPEN_PREFIXES.stream().anyMatch(path::startsWith)) {
                    op.setSecurity(List.of());
                } else if (path.startsWith(PRODUCTS_PREFIX)) {
                    op.setSecurity(List.of(new SecurityRequirement().addList(CLIENT_ID).addList(CLIENT_SECRET).addList(BEARER)));
                } else {
                    op.setSecurity(List.of(new SecurityRequirement().addList(BEARER)));
                }
            }));
        };
    }
}
