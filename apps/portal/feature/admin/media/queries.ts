import { queryOptions } from "@tanstack/react-query";
import { adminMediaClient } from "./client";
import type { MediaListParams } from "./type";

export const adminMediaKeys = {
  all: ["admin", "media"] as const,
  list: (params: MediaListParams) => [...adminMediaKeys.all, "list", params] as const,
  detail: (id: string) => [...adminMediaKeys.all, "detail", id] as const,
};

export const mediaListQuery = (params: MediaListParams) =>
  queryOptions({
    queryKey: adminMediaKeys.list(params),
    queryFn: () => adminMediaClient.list(params).then((response) => response.data),
  });

export const mediaQuery = (id: string) =>
  queryOptions({
    queryKey: adminMediaKeys.detail(id),
    queryFn: () => adminMediaClient.getImage({ id }).then((response) => response.data.data),
  });
