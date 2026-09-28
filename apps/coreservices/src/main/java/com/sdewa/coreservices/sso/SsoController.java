package com.sdewa.coreservices.sso;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.security.HubAuthentication;
import com.sdewa.coreservices.sso.SsoDtos.CodeRequest;
import com.sdewa.coreservices.sso.SsoDtos.CodeResponse;
import com.sdewa.coreservices.sso.SsoDtos.TokenRequest;
import com.sdewa.coreservices.sso.SsoDtos.TokenResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** {@code POST /sso/codes} (User) and {@code POST /sso/token} (server to server, client secret). */
@RestController
@RequestMapping("/sso")
public class SsoController {

    private final SsoService sso;

    public SsoController(SsoService sso) {
        this.sso = sso;
    }

    @PostMapping("/codes")
    public ResponseEntity<ApiResponse<CodeResponse>> code(HubAuthentication auth, @Valid @RequestBody CodeRequest request) {
        return Responses.created(sso.createCode(auth.userId(), request));
    }

    @PostMapping("/token")
    public ResponseEntity<ApiResponse<TokenResponse>> token(@Valid @RequestBody TokenRequest request) {
        return Responses.ok(sso.exchange(request), "Token issued");
    }
}
