package com.sdewa.coreservices.admin;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.PagedResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.common.paging.PageQuery;
import com.sdewa.coreservices.media.MediaDtos.AdminImage;
import com.sdewa.coreservices.media.MediaService;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;

import java.util.Map;
import java.util.UUID;

/** Admin 6.4 — Media library (UC-19). */
@RestController
@RequestMapping("/admin/media")
public class AdminMediaController {

    private static final Map<String, String> SORT = Map.of("createdAt", "createdAt");

    private final MediaService media;

    public AdminMediaController(MediaService media) {
        this.media = media;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<AdminImage>> list(@RequestParam(required = false) String q,
                                                          @RequestParam(required = false) Boolean unused,
                                                          @RequestParam(required = false) Integer page,
                                                          @RequestParam(required = false) Integer limit,
                                                          @RequestParam(required = false) String sort) {
        PageQuery pq = PageQuery.parse(page, limit, sort, SORT, "createdAt", Sort.Direction.DESC);
        MediaService.ListResult r = media.list(q, unused, pq);
        return Responses.page(r.items(), r.total(), pq.page(), pq.limit(), null);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AdminImage>> upload(@RequestPart(value = "file", required = false) MultipartFile file,
                                                          @RequestParam(value = "alt", required = false) String alt) {
        MediaService.UploadResult r = media.upload(file, alt);
        return r.created()
                ? Responses.status(HttpStatus.CREATED, r.image(), "Image uploaded")
                : Responses.ok(r.image(), "Image already in the library");
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminImage>> get(@PathVariable UUID id) {
        return Responses.ok(media.get(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminImage>> patch(@PathVariable UUID id, @RequestBody JsonNode body) {
        return Responses.ok(media.patch(id, body), Responses.MSG_UPDATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        media.delete(id);
        return ResponseEntity.noContent().build();
    }
}
