package com.sdewa.coreservices.admin;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.PagedResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.payment.AdminTransactionService;
import com.sdewa.coreservices.payment.PaymentDtos.AdminTransactionView;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

/** Admin 6.1 — Users (UC-14), read-only. */
@RestController
@RequestMapping("/admin/users")
public class AdminUserController {

    private final AdminUserService users;
    private final AdminTransactionService transactions;

    public AdminUserController(AdminUserService users, AdminTransactionService transactions) {
        this.users = users;
        this.transactions = transactions;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<AdminUserService.AdminUserSummary>> list(@RequestParam(required = false) String q,
                                                                                 @RequestParam(required = false) String productCode,
                                                                                 @RequestParam(required = false) Integer page,
                                                                                 @RequestParam(required = false) Integer limit,
                                                                                 @RequestParam(required = false) String sort) {
        PageQuery pq = PageQuery.parse(page, limit, sort, AdminUserService.SORT, "createdAt", Sort.Direction.DESC);
        AdminUserService.ListResult r = users.list(q, productCode, pq);
        return Responses.page(r.items(), r.total(), pq.page(), pq.limit(), null);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminUserService.AdminUser>> get(@PathVariable UUID id) {
        return Responses.ok(users.get(id));
    }

    @GetMapping("/{id}/transactions")
    public ResponseEntity<PagedResponse<AdminTransactionView>> transactions(@PathVariable UUID id,
                                                                            @RequestParam(required = false) Integer page,
                                                                            @RequestParam(required = false) Integer limit,
                                                                            @RequestParam(required = false) String sort) {
        users.requireExists(id);
        PageQuery pq = PageQuery.parse(page, limit, sort, AdminTransactionService.SORT, "createdAt", Sort.Direction.DESC);
        AdminTransactionService.Result r = transactions.list(
                new AdminTransactionService.Filter(id, null, Set.of(), null, null, null, null), pq);
        return Responses.page(r.items(), r.total(), pq.page(), pq.limit(), r.summary());
    }
}
