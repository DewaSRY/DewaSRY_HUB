package com.sdewa.coreservices.admin;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.content.ContentDtos.AdminTerm;
import com.sdewa.coreservices.content.ContentDtos.Mutation;
import com.sdewa.coreservices.content.ContentDtos.TermInput;
import com.sdewa.coreservices.content.TaxonomyAdminService;
import com.sdewa.coreservices.content.TaxonomyAdminService.Kind;
import com.sdewa.coreservices.content.revalidation.RevalidationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.UUID;

/** Admin 6.5 / 6.6 — Categories and tags (UC-20). Not paged. */
@RestController
@RequestMapping("/admin")
public class AdminTaxonomyController {

    private final TaxonomyAdminService taxonomy;
    private final RevalidationService revalidation;

    public AdminTaxonomyController(TaxonomyAdminService taxonomy, RevalidationService revalidation) {
        this.taxonomy = taxonomy;
        this.revalidation = revalidation;
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<AdminTerm>>> categories() {
        return Responses.ok(taxonomy.list(Kind.CATEGORY), Responses.MSG_LIST);
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<AdminTerm>> createCategory(@Valid @RequestBody TermInput input) {
        return Responses.created(taxonomy.create(Kind.CATEGORY, input));
    }

    @PatchMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<AdminTerm>> patchCategory(@PathVariable UUID id, @RequestBody JsonNode body) {
        return Responses.ok(revalidate(taxonomy.patch(Kind.CATEGORY, id, body)), Responses.MSG_UPDATED);
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID id) {
        revalidation.revalidate(taxonomy.delete(Kind.CATEGORY, id).paths());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/tags")
    public ResponseEntity<ApiResponse<List<AdminTerm>>> tags() {
        return Responses.ok(taxonomy.list(Kind.TAG), Responses.MSG_LIST);
    }

    @PostMapping("/tags")
    public ResponseEntity<ApiResponse<AdminTerm>> createTag(@Valid @RequestBody TermInput input) {
        return Responses.created(taxonomy.create(Kind.TAG, input));
    }

    @PatchMapping("/tags/{id}")
    public ResponseEntity<ApiResponse<AdminTerm>> patchTag(@PathVariable UUID id, @RequestBody JsonNode body) {
        return Responses.ok(revalidate(taxonomy.patch(Kind.TAG, id, body)), Responses.MSG_UPDATED);
    }

    @DeleteMapping("/tags/{id}")
    public ResponseEntity<Void> deleteTag(@PathVariable UUID id) {
        revalidation.revalidate(taxonomy.delete(Kind.TAG, id).paths());
        return ResponseEntity.noContent().build();
    }

    private AdminTerm revalidate(Mutation<AdminTerm> m) {
        return m.paths().isEmpty() ? m.value() : m.value().withRevalidation(revalidation.revalidate(m.paths()));
    }
}
