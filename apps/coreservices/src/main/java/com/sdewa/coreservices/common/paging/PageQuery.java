package com.sdewa.coreservices.common.paging;

import com.sdewa.coreservices.common.error.ApiException;
import com.sdewa.coreservices.common.error.ErrorReason;
import com.sdewa.coreservices.common.error.FieldErrorItem;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Parsed {@code page}, {@code limit}, {@code sort} query parameters (ADR-003 §3.4): 1-based page,
 * limit 1..100 (default 20), and {@code field,asc|desc} with a per-endpoint allow-list.
 *
 * @param sortField API field name (from the allow-list)
 * @param property  entity property / SQL expression the API field maps to
 */
public record PageQuery(int page, int limit, String sortField, String property, Sort.Direction direction) {

    public static final int DEFAULT_LIMIT = 20;
    public static final int MAX_LIMIT = 100;

    /**
     * @param allowed map of API sort field → entity property; the first entry is not the default
     * @param defaultField default API sort field
     * @param defaultDirection default direction
     */
    public static PageQuery parse(Integer page, Integer limit, String sort,
                                  Map<String, String> allowed, String defaultField, Sort.Direction defaultDirection) {
        List<FieldErrorItem> errors = new ArrayList<>();
        int p = page == null ? 1 : page;
        int l = limit == null ? DEFAULT_LIMIT : limit;
        if (p < 1) {
            errors.add(new FieldErrorItem("page", "Must be 1 or greater."));
        }
        if (l < 1 || l > MAX_LIMIT) {
            errors.add(new FieldErrorItem("limit", "Must be between 1 and " + MAX_LIMIT + "."));
        }
        String field = defaultField;
        Sort.Direction direction = defaultDirection;
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            field = parts[0].trim();
            if (parts.length > 2 || !allowed.containsKey(field)) {
                errors.add(new FieldErrorItem("sort", "Allowed sort fields: " + String.join(", ", allowed.keySet()) + "."));
            } else if (parts.length == 2) {
                String dir = parts[1].trim().toLowerCase();
                if (dir.equals("asc")) {
                    direction = Sort.Direction.ASC;
                } else if (dir.equals("desc")) {
                    direction = Sort.Direction.DESC;
                } else {
                    errors.add(new FieldErrorItem("sort", "Direction must be asc or desc."));
                }
            } else {
                direction = Sort.Direction.ASC;
            }
        }
        if (!errors.isEmpty()) {
            throw new ApiException(ErrorReason.VALIDATION_FAILED, errors);
        }
        return new PageQuery(p, l, field, allowed.get(field), direction);
    }

    public Pageable pageable() {
        return PageRequest.of(page - 1, limit, Sort.by(direction, property));
    }

    /** Same as {@link #pageable()} with a stable secondary order on {@code id}. */
    public Pageable pageableWithTieBreak() {
        return PageRequest.of(page - 1, limit, Sort.by(direction, property).and(Sort.by(Sort.Direction.DESC, "id")));
    }

    public long offset() {
        return (long) (page - 1) * limit;
    }
}
