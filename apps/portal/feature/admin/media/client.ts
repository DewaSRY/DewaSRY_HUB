import type { AxiosResponse } from "axios";
import { BaseClient } from "@/lib/api/base-client";
import type { ApiPage, ApiResponse } from "@/lib/api/envelope";
import type { AdminImage, MediaListParams, UploadMediaInput } from "./type";

/** Admin 6.4 — Media (ADR-003 §10.4). */
class AdminMediaClient extends BaseClient {
  list(params: MediaListParams): Promise<AxiosResponse<ApiPage<AdminImage>>> {
    return this.get({
      endpoint: "/admin/media",
      params: { q: params.q, unused: params.unused || undefined, page: params.page, limit: params.limit, sort: params.sort ?? "createdAt,desc" },
    });
  }

  /** `multipart/form-data`: `file` + `alt`. 201 new, 200 when the content hash already exists. */
  upload({ file, alt }: UploadMediaInput, onProgress?: (percent: number) => void): Promise<AxiosResponse<ApiResponse<AdminImage>>> {
    const body = new FormData();
    body.append("file", file);
    body.append("alt", alt);
    return this.post({
      endpoint: "/admin/media",
      body,
      config: {
        timeout: 120_000,
        onUploadProgress: (event) => {
          if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
    });
  }

  getImage({ id }: { id: string }): Promise<AxiosResponse<ApiResponse<AdminImage>>> {
    return this.get({ endpoint: `/admin/media/${id}` });
  }

  updateAlt({ id, alt }: { id: string; alt: string }): Promise<AxiosResponse<ApiResponse<AdminImage>>> {
    return this.patch({ endpoint: `/admin/media/${id}`, body: { alt } });
  }

  remove({ id }: { id: string }): Promise<AxiosResponse<void>> {
    return this.delete({ endpoint: `/admin/media/${id}` });
  }
}

export const adminMediaClient = new AdminMediaClient();
