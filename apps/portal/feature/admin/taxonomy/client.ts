import type { AxiosResponse } from "axios";
import { BaseClient } from "@/lib/api/base-client";
import type { ApiResponse } from "@/lib/api/envelope";
import type { AdminTaxonomy, TaxonomyInput, TaxonomyKind } from "./type";

/** Admin 6.5 Categories / 6.6 Tags — same shape, different prefix. */
class AdminTaxonomyClient extends BaseClient {
  list({ kind }: { kind: TaxonomyKind }): Promise<AxiosResponse<ApiResponse<AdminTaxonomy[]>>> {
    return this.get({ endpoint: `/admin/${kind}` });
  }

  create({ kind, body }: { kind: TaxonomyKind; body: TaxonomyInput }): Promise<AxiosResponse<ApiResponse<AdminTaxonomy>>> {
    return this.post({ endpoint: `/admin/${kind}`, body });
  }

  update({ kind, id, body }: { kind: TaxonomyKind; id: string; body: Partial<TaxonomyInput> }): Promise<AxiosResponse<ApiResponse<AdminTaxonomy>>> {
    return this.patch({ endpoint: `/admin/${kind}/${id}`, body });
  }

  remove({ kind, id }: { kind: TaxonomyKind; id: string }): Promise<AxiosResponse<void>> {
    return this.delete({ endpoint: `/admin/${kind}/${id}` });
  }
}

export const adminTaxonomyClient = new AdminTaxonomyClient();
