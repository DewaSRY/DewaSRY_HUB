package com.sdewa.coreservices.security;

import com.sdewa.coreservices.identity.UserService;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Turns a verified token into a {@link HubAuthentication}. The role comes from PostgreSQL, never
 * from the token (ADR-001 §5.7 step 4). The user row is created on first sight (PRD OQ4).
 */
@Component
public class HubJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserService userService;

    public HubJwtAuthenticationConverter(UserService userService) {
        this.userService = userService;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        UserService.EnsuredUser ensured = userService.ensureUser(TokenIdentity.from(jwt));
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + ensured.role().name()));
        return new HubAuthentication(jwt, authorities, ensured.userId(), ensured.created());
    }
}
