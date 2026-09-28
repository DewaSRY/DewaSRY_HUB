package com.sdewa.coreservices.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.filter.ShallowEtagHeaderFilter;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

/**
 * Web wiring: every hub controller lives under {@code /v1} (ADR-003 §3.1) while Actuator stays at
 * {@code /actuator} (blocked by Nginx). Public reads get an ETag.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    public static final String API_PREFIX = "/v1";

    private final HubProperties properties;

    public WebConfig(HubProperties properties) {
        this.properties = properties;
    }

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.addPathPrefix(API_PREFIX,
                HandlerTypePredicate.forBasePackage("com.sdewa.coreservices").and(HandlerTypePredicate.forAnnotation(RestController.class)));
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        if ("local".equalsIgnoreCase(properties.getStorage().getType())) {
            String location = Path.of(properties.getStorage().getLocalDir()).toAbsolutePath().normalize().toUri().toString().replaceAll("/?$", "/");
            registry.addResourceHandler("/local-media/**").addResourceLocations(location);
        }
    }

    @Bean
    public FilterRegistrationBean<ShallowEtagHeaderFilter> publicEtagFilter() {
        FilterRegistrationBean<ShallowEtagHeaderFilter> bean = new FilterRegistrationBean<>(new ShallowEtagHeaderFilter());
        bean.addUrlPatterns(API_PREFIX + "/public/*");
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE + 2);
        return bean;
    }
}
