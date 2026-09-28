package com.sdewa.coreservices.admin;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.PagedResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.config.WebConfig;
import com.sdewa.coreservices.content.ArticleAdminService;
import com.sdewa.coreservices.content.ArticleStatus;
import com.sdewa.coreservices.content.ContentDtos.AdminArticle;
import com.sdewa.coreservices.content.ContentDtos.AdminArticleSummary;
import com.sdewa.coreservices.content.ContentDtos.ArticleInput;
import com.sdewa.coreservices.content.ContentDtos.Mutation;
import com.sdewa.coreservices.content.revalidation.RevalidationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.UUID;

/** Admin 6.3 — Articles (UC-16, UC-17, UC-18). Revalidation runs after the service commits. */
@RestController
@RequestMapping("/admin/articles")
public class AdminArticleController {

    private final ArticleAdminService articles;
    private final RevalidationService revalidation;

    public AdminArticleController(ArticleAdminService articles, RevalidationService revalidation) {
        this.articles = articles;
        this.revalidation = revalidation;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<AdminArticleSummary>> list(@RequestParam(required = false) String q,
                                                                   @RequestParam(required = false) ArticleStatus status,
                                                                   @RequestParam(required = false) UUID category,
                                                                   @RequestParam(required = false) UUID tag,
                                                                   @RequestParam(required = false) Integer page,
                                                                   @RequestParam(required = false) Integer limit,
                                                                   @RequestParam(required = false) String sort) {
        PageQuery pq = PageQuery.parse(page, limit, sort, ArticleAdminService.SORT, "updatedAt", Sort.Direction.DESC);
        ArticleAdminService.ListResult r = articles.list(q, status, category, tag, pq);
        return Responses.page(r.items(), r.total(), pq.page(), pq.limit(), null);
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminArticle>> create(@Valid @RequestBody ArticleInput input) {
        AdminArticle created = articles.create(input);
        return Responses.created(URI.create(WebConfig.API_PREFIX + "/admin/articles/" + created.id()), created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminArticle>> get(@PathVariable UUID id) {
        return Responses.ok(articles.get(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminArticle>> update(@PathVariable UUID id, @Valid @RequestBody ArticleInput input) {
        return Responses.ok(revalidate(articles.update(id, input)), Responses.MSG_UPDATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        Mutation<Void> m = articles.delete(id);
        revalidation.revalidate(m.paths());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<AdminArticle>> publish(@PathVariable UUID id) {
        return Responses.ok(revalidate(articles.publish(id)), "Article published");
    }

    @PostMapping("/{id}/unpublish")
    public ResponseEntity<ApiResponse<AdminArticle>> unpublish(@PathVariable UUID id) {
        return Responses.ok(revalidate(articles.unpublish(id)), "Article unpublished");
    }

    private AdminArticle revalidate(Mutation<AdminArticle> m) {
        return m.paths().isEmpty() ? m.value() : m.value().withRevalidation(revalidation.revalidate(m.paths()));
    }
}
