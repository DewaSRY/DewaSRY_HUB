package com.sdewa.coreservices.payment;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.PagedResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.payment.PaymentDtos.CheckoutRequest;
import com.sdewa.coreservices.payment.PaymentDtos.TransactionView;
import com.sdewa.coreservices.security.HubAuthentication;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.util.Map;

/** Group 3 — Billing (ADR-003 §7). */
@RestController
public class MeTransactionController {

    private static final Map<String, String> SORT = Map.of("createdAt", "createdAt");

    private final CheckoutService checkout;
    private final PaymentTransactionRepository transactions;
    private final Clock clock;

    public MeTransactionController(CheckoutService checkout, PaymentTransactionRepository transactions, Clock clock) {
        this.checkout = checkout;
        this.transactions = transactions;
        this.clock = clock;
    }

    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<TransactionView>> checkout(HubAuthentication auth, @Valid @RequestBody CheckoutRequest request,
                                                                 @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        CheckoutService.CheckoutResult result = checkout.checkout(auth.userId(), request.planId(), idempotencyKey);
        return result.created()
                ? Responses.status(HttpStatus.CREATED, result.transaction(), "Checkout created")
                : Responses.ok(result.transaction(), "Checkout reused");
    }

    @GetMapping("/me/transactions")
    @Transactional(readOnly = true)
    public ResponseEntity<PagedResponse<TransactionView>> list(HubAuthentication auth,
                                                               @RequestParam(required = false) TransactionStatus status,
                                                               @RequestParam(required = false) Integer page,
                                                               @RequestParam(required = false) Integer limit,
                                                               @RequestParam(required = false) String sort) {
        PageQuery q = PageQuery.parse(page, limit, sort, SORT, "createdAt", Sort.Direction.DESC);
        Page<PaymentTransaction> result = status == null
                ? transactions.findAllByUserId(auth.userId(), q.pageable())
                : transactions.findAllByUserIdAndStatus(auth.userId(), status, q.pageable());
        var now = clock.instant();
        return Responses.page(result, t -> TransactionMapper.toView(t, now));
    }

    /** 404 when the order does not exist or is not the caller's (ADR-003 §3.5). */
    @GetMapping("/me/transactions/{orderId}")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<TransactionView>> get(HubAuthentication auth, @PathVariable String orderId) {
        PaymentTransaction t = transactions.findByOrderIdAndUserId(orderId, auth.userId()).orElseThrow(ApiException::notFound);
        return Responses.ok(TransactionMapper.toView(t, clock.instant()));
    }
}
