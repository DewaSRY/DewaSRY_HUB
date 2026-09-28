package com.sdewa.coreservices.admin;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.PagedResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.error.FieldErrorItem;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.payment.AdminTransactionService;
import com.sdewa.coreservices.payment.PaymentDtos.AdminTransactionDetail;
import com.sdewa.coreservices.payment.PaymentDtos.AdminTransactionView;
import com.sdewa.coreservices.payment.TransactionStatus;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Admin 6.2 — Transactions (UC-15). */
@RestController
@RequestMapping("/admin/transactions")
public class AdminTransactionController {

    private final AdminTransactionService transactions;

    public AdminTransactionController(AdminTransactionService transactions) {
        this.transactions = transactions;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<AdminTransactionView>> list(@RequestParam(required = false) UUID userId,
                                                                    @RequestParam(required = false) String productCode,
                                                                    @RequestParam(required = false) List<TransactionStatus> status,
                                                                    @RequestParam(required = false) String from,
                                                                    @RequestParam(required = false) String to,
                                                                    @RequestParam(required = false) String q,
                                                                    @RequestParam(required = false) Boolean needsReview,
                                                                    @RequestParam(required = false) Integer page,
                                                                    @RequestParam(required = false) Integer limit,
                                                                    @RequestParam(required = false) String sort) {
        PageQuery pq = PageQuery.parse(page, limit, sort, AdminTransactionService.SORT, "createdAt", Sort.Direction.DESC);
        Set<TransactionStatus> statuses = status == null || status.isEmpty() ? Set.of() : EnumSet.copyOf(status);
        AdminTransactionService.Filter filter = new AdminTransactionService.Filter(userId, productCode, statuses,
                parseInstant("from", from, false), parseInstant("to", to, true), q, needsReview);
        AdminTransactionService.Result r = transactions.list(filter, pq);
        return Responses.page(r.items(), r.total(), pq.page(), pq.limit(), r.summary());
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<AdminTransactionDetail>> get(@PathVariable String orderId) {
        return Responses.ok(transactions.detail(orderId));
    }

    @PostMapping("/{orderId}/sync")
    public ResponseEntity<ApiResponse<AdminTransactionDetail>> sync(@PathVariable String orderId) {
        return Responses.ok(transactions.sync(orderId), "Synced with Midtrans");
    }

    /**
     * {@code from}/{@code to} are ISO dates (inclusive days, UTC) or ISO instants. {@code to} as a
     * date means "until the end of that day".
     */
    static Instant parseInstant(String field, String value, boolean endOfDay) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            if (value.length() == 10) {
                LocalDate d = LocalDate.parse(value);
                return (endOfDay ? d.plusDays(1) : d).atStartOfDay(ZoneOffset.UTC).toInstant();
            }
            return Instant.parse(value);
        } catch (RuntimeException e) {
            throw new ApiException(ErrorReason.VALIDATION_FAILED, List.of(new FieldErrorItem(field, "Must be an ISO date (YYYY-MM-DD) or instant.")));
        }
    }
}
