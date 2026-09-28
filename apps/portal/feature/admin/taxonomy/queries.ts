import { queryOptions } from "@tanstack/react-query";
import { adminTaxonomyClient } from "./client";
import type { TaxonomyKind } from "./type";

export const adminTaxonomyKeys = {
  all: ["admin", "taxonomy"] as const,
  list: (kind: TaxonomyKind) => [...adminTaxonomyKeys.all, kind] as const,
};

export const taxonomyListQuery = (kind: TaxonomyKind) =>
  queryOptions({
    queryKey: adminTaxonomyKeys.list(kind),
    queryFn: () => adminTaxonomyClient.list({ kind }).then((response) => response.data.data),
  });
