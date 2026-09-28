"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminMediaClient } from "./client";
import { adminMediaKeys, mediaListQuery, mediaQuery } from "./queries";
import type { MediaListParams, UploadMediaInput } from "./type";

export function useMediaList(params: MediaListParams, options: { enabled?: boolean } = {}) {
  return useQuery({ ...mediaListQuery(params), placeholderData: keepPreviousData, enabled: options.enabled ?? true });
}

export function useMedia(id: string | null) {
  return useQuery({ ...mediaQuery(id ?? ""), enabled: Boolean(id) });
}

export function useUploadMedia(onProgress?: (percent: number) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadMediaInput) => adminMediaClient.upload(input, onProgress).then((response) => response.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminMediaKeys.all }),
    meta: { successMessage: { key: "admin:media.uploaded" }, errorMessage: false },
  });
}

export function useUpdateMediaAlt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; alt: string }) => adminMediaClient.updateAlt(input).then((response) => response.data.data),
    onSuccess: (image) => {
      queryClient.setQueryData(adminMediaKeys.detail(image.id), image);
      void queryClient.invalidateQueries({ queryKey: [...adminMediaKeys.all, "list"] });
    },
    meta: { successMessage: { key: "admin:media.altSaved" }, errorMessage: false },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminMediaClient.remove({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminMediaKeys.all }),
    meta: { successMessage: { key: "admin:media.deleted" }, errorMessage: false },
  });
}
