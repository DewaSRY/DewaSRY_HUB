package com.sdewa.coreservices.security;

import com.sdewa.coreservices.common.error.ErrorResponseWriter;
import com.sdewa.coreservices.config.HubProperties;
import com.sdewa.coreservices.product.ProductCredentialService;
import com.sdewa.coreservices.product.ProductRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * One security rule per endpoint group (ADR-003 §4): public / webhooks / SSO token exchange are
 * open (webhooks and SSO check their own signature or client secret), {@code /admin/**} needs
 * {@code ROLE_ADMIN}, {@code /products/**} additionally needs a product client credential, and
 * everything else needs a valid Firebase ID token.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final String[] OPEN = {
            "/v1/public/**", "/v1/webhooks/**", "/v1/sso/token", "/v1/dev/**",
            "/local-media/**", "/v1/openapi.json", "/v1/openapi.json/**", "/v1/swagger-ui/**", "/v1/swagger-ui.html",
            "/actuator/health", "/actuator/health/**", "/actuator/info", "/error"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtDecoder jwtDecoder,
                                                   HubJwtAuthenticationConverter converter, JsonAuthHandlers handlers,
                                                   ProductCredentialService credentialService,
                                                   ProductRepository productRepository, ErrorResponseWriter writer) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {
                })
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(h -> h.cacheControl(c -> c.disable()))
                .formLogin(f -> f.disable())
                .httpBasic(b -> b.disable())
                .logout(l -> l.disable())
                .requestCache(r -> r.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(OPEN).permitAll()
                        .requestMatchers("/v1/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(o -> o
                        .bearerTokenResolver(bearerTokenResolver())
                        .jwt(j -> j.decoder(jwtDecoder).jwtAuthenticationConverter(converter))
                        .authenticationEntryPoint(handlers)
                        .accessDeniedHandler(handlers))
                .exceptionHandling(e -> e.authenticationEntryPoint(handlers).accessDeniedHandler(handlers))
                .addFilterBefore(new ProductClientFilter(credentialService, productRepository, writer),
                        BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    /** Open endpoints ignore any Authorization header, so a stale token never breaks them. */
    private BearerTokenResolver bearerTokenResolver() {
        DefaultBearerTokenResolver delegate = new DefaultBearerTokenResolver();
        return (HttpServletRequest request) -> {
            String path = request.getRequestURI().substring(request.getContextPath().length());
            if (path.startsWith("/v1/public/") || path.startsWith("/v1/webhooks/") || path.equals("/v1/sso/token")
                    || path.startsWith("/actuator/") || path.startsWith("/local-media/")) {
                return null;
            }
            return delegate.resolve(request);
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(HubProperties properties) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(properties.getCors().getAllowedOrigins().stream().map(String::trim).filter(s -> !s.isEmpty()).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key", "X-Timezone", "X-Trace-Id"));
        config.setExposedHeaders(List.of("X-Trace-Id", "Location"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/v1/**", config);
        return source;
    }
}
