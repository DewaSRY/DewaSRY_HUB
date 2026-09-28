package com.sdewa.coreservices.admin;

import com.sdewa.coreservices.common.api.ApiResponse;
import com.sdewa.coreservices.common.api.Responses;
import com.sdewa.coreservices.content.linkpreview.LinkPreviewService;
import com.sdewa.coreservices.content.linkpreview.LinkPreviewService.LinkPreview;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** {@code POST /admin/link-preview} (ADR-009 §5.5). */
@RestController
@RequestMapping("/admin/link-preview")
public class AdminLinkPreviewController {

    private final LinkPreviewService previews;

    public AdminLinkPreviewController(LinkPreviewService previews) {
        this.previews = previews;
    }

    public record LinkPreviewRequest(@NotBlank @Size(max = 2048) String url) {
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LinkPreview>> preview(@Valid @RequestBody LinkPreviewRequest request) {
        return Responses.ok(previews.preview(request.url()));
    }
}
