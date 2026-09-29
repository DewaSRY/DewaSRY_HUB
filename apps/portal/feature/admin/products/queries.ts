import { queryOptions } from "@tanstack/react-query";
import { adminProductClient } from "./client";

export const adminProductKeys = {
  all: ["admin", "products"] as const,
  list: () => [...adminProductKeys.all, "list"] as const,
  detail: (id: string) => [...adminProductKeys.all, "detail", id] as const,
};

export const adminProductsQuery = () =>
  queryOptions({
    queryKey: adminProductKeys.list(),
    queryFn: () => adminProductClient.list().then((response) => response.data.data),
  });

export const adminProductQuery = (id: string) =>
  queryOptions({
    queryKey: adminProductKeys.detail(id),
    queryFn: () => adminProductClient.getProduct({ id }).then((response) => response.data.data),
  });
