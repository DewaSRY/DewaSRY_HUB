package com.sdewa.coreservices.payment;

import com.sdewa.coreservices.common.api.Money;
import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.common.util.Texts;
import com.sdewa.coreservices.identity.User;
import com.sdewa.coreservices.identity.UserRepository;
import com.sdewa.coreservices.payment.PaymentDtos.AdminTransactionDetail;
import com.sdewa.coreservices.payment.PaymentDtos.AdminTransactionView;
import com.sdewa.coreservices.payment.PaymentDtos.TransactionSummary;
import com.sdewa.coreservices.payment.PaymentDtos.UserRef;
import com.sdewa.coreservices.payment.midtrans.MidtransException;
import com.sdewa.coreservices.payment.midtrans.MidtransGateway;
import com.sdewa.coreservices.payment.midtrans.MidtransStatus;
import com.sdewa.coreservices.subscription.SubscriptionService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Admin payment history (UC-15, ADR-003 §10.2). Read-only, plus "Sync with Midtrans". */
@Service
public class AdminTransactionService {

    public static final Map<String, String> SORT = Map.of("createdAt", "createdAt", "amount", "amount");

    private final PaymentTransactionRepository transactions;
    private final TransactionStatusHistoryRepository history;
    private final UserRepository users;
    private final SubscriptionService subscriptions;
    private final MidtransGateway gateway;
    private final PaymentStatusService statusService;
    private final EntityManager em;

    public AdminTransactionService(PaymentTransactionRepository transactions, TransactionStatusHistoryRepository history,
                                   UserRepository users, SubscriptionService subscriptions, MidtransGateway gateway,
                                   PaymentStatusService statusService, EntityManager em) {
        this.transactions = transactions;
        this.history = history;
        this.users = users;
        this.subscriptions = subscriptions;
        this.gateway = gateway;
        this.statusService = statusService;
        this.em = em;
    }

    public record Filter(UUID userId, String productCode, Set<TransactionStatus> statuses, Instant from, Instant to,
                         String q, Boolean needsReview) {
    }

    public record Result(List<AdminTransactionView> items, long total, TransactionSummary summary) {
    }

    @Transactional(readOnly = true)
    public Result list(Filter filter, PageQuery page) {
        Specification<PaymentTransaction> spec = spec(filter);
        Page<PaymentTransaction> result = transactions.findAll(spec, page.pageableWithTieBreak());
        Map<UUID, UserRef> userRefs = userRefs(result.getContent().stream().map(PaymentTransaction::getUserId).collect(Collectors.toSet()));
        List<AdminTransactionView> items = result.getContent().stream()
                .map(t -> {
                    t.getProduct().getName();
                    t.getPlan().getName();
                    return TransactionMapper.toAdmin(t, userRefs.get(t.getUserId()));
                }).toList();
        return new Result(items, result.getTotalElements(), summary(spec));
    }

    @Transactional(readOnly = true)
    public AdminTransactionDetail detail(String orderId) {
        return detail(transactions.findByOrderId(orderId).orElseThrow(ApiException::notFound), null);
    }

    /** UC-15 "Sync with Midtrans": fetch the Status API and apply UC-09 steps 3–8. */
    public AdminTransactionDetail sync(String orderId) {
        transactions.findByOrderId(orderId).orElseThrow(ApiException::notFound);
        MidtransStatus status;
        try {
            status = gateway.fetchStatus(orderId);
        } catch (MidtransException e) {
            throw new ApiException(ErrorReason.UPSTREAM_ERROR, "Midtrans Status API failed");
        }
        PaymentStatusService.Outcome outcome = statusService.apply(orderId, status, StatusSource.SYNC);
        boolean changed = outcome == PaymentStatusService.Outcome.APPLIED || outcome == PaymentStatusService.Outcome.AMOUNT_MISMATCH;
        return readDetail(orderId, changed);
    }

    @Transactional(readOnly = true)
    protected AdminTransactionDetail readDetail(String orderId, boolean changed) {
        return detail(transactions.findByOrderId(orderId).orElseThrow(ApiException::notFound), changed);
    }

    private AdminTransactionDetail detail(PaymentTransaction t, Boolean changed) {
        UserRef user = userRefs(Set.of(t.getUserId())).get(t.getUserId());
        return TransactionMapper.toDetail(t, user, history.findAllByTransactionIdOrderByCreatedAtAscIdAsc(t.getId()),
                t.getSubscriptionId() == null ? null : subscriptions.view(t.getSubscriptionId()), changed);
    }

    private Map<UUID, UserRef> userRefs(Set<UUID> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return users.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> new UserRef(u.getId(), u.getEmail(), u.getName()), (a, b) -> a));
    }

    private TransactionSummary summary(Specification<PaymentTransaction> spec) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
        Root<PaymentTransaction> root = cq.from(PaymentTransaction.class);
        Predicate where = spec.toPredicate(root, cq, cb);
        var isPaid = cb.equal(root.get("status"), TransactionStatus.PAID);
        cq.select(cb.array(
                cb.count(root),
                cb.sum(cb.<Long>selectCase().when(isPaid, 1L).otherwise(0L)),
                cb.sum(cb.<Long>selectCase().when(isPaid, root.<Long>get("amount")).otherwise(0L))));
        if (where != null) {
            cq.where(where);
        }
        Object[] row = em.createQuery(cq).getSingleResult();
        long count = row[0] == null ? 0 : ((Number) row[0]).longValue();
        long paidCount = row[1] == null ? 0 : ((Number) row[1]).longValue();
        long paidAmount = row[2] == null ? 0 : ((Number) row[2]).longValue();
        return new TransactionSummary(count, paidCount, Money.idr(paidAmount));
    }

    static Specification<PaymentTransaction> spec(Filter f) {
        return (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (f.userId() != null) {
                ps.add(cb.equal(root.get("userId"), f.userId()));
            }
            if (f.productCode() != null && !f.productCode().isBlank()) {
                ps.add(cb.equal(root.get("product").get("code"), f.productCode()));
            }
            if (f.statuses() != null && !f.statuses().isEmpty()) {
                ps.add(root.get("status").in(f.statuses()));
            }
            if (f.from() != null) {
                ps.add(cb.greaterThanOrEqualTo(root.get("createdAt"), f.from()));
            }
            if (f.to() != null) {
                ps.add(cb.lessThan(root.get("createdAt"), f.to()));
            }
            if (f.needsReview() != null) {
                ps.add(cb.equal(root.get("needsReview"), f.needsReview()));
            }
            if (f.q() != null && !f.q().isBlank()) {
                String like = Texts.likeContains(f.q().trim());
                Subquery<UUID> byEmail = query.subquery(UUID.class);
                Root<User> u = byEmail.from(User.class);
                byEmail.select(u.get("id")).where(cb.like(cb.lower(u.get("email")), like, '\\'));
                ps.add(cb.or(cb.like(cb.lower(root.get("orderId")), like, '\\'), root.get("userId").in(byEmail)));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
    }
}
