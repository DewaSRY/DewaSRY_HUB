"use client";

import { useState } from "react";
import { parseAsBoolean, parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useTranslation } from "react-i18next";
import { ImagePlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import Pagination from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/checkbox";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { QueryErrorState } from "@/components/common/query-error-state";
import { useDebounce } from "@/hooks/use-debounce";
import { useMediaList } from "../hooks";
import { MediaGrid } from "./media-grid";
import { MediaDetailDialog } from "./media-detail-dialog";
import { UploadMediaDialog } from "./upload-media-dialog";

/** `/admin/media` (UC-19): upload, search, browse, copy URLs, delete unused images. */
export function MediaLibraryScreen() {
  const { t } = useTranslation("admin");
  const [query, setQuery] = useQueryStates({
    q: parseAsString.withDefault(""),
    unused: parseAsBoolean.withDefault(false),
    page: parseAsInteger.withDefault(1),
    limit: parseAsInteger.withDefault(30),
  });
  const [search, setSearch] = useState(query.q);
  const q = useDebounce(search, 300);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const list = useMediaList({ q: q || undefined, unused: query.unused || undefined, page: query.page, limit: query.limit });

  return (
    <PageContainer>
      <PageHeader
        title={t("media.title")}
        description={t("media.description")}
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload aria-hidden />
            {t("media.upload")}
          </Button>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          className="sm:max-w-sm"
          search={search}
          onSearch={(value) => {
            setSearch(value);
            void setQuery({ q: value || null, page: 1 });
          }}
          placeholder={t("media.searchPlaceholder")}
        />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={query.unused} onChange={(event) => void setQuery({ unused: event.target.checked || null, page: 1 })} />
          {t("media.unusedOnly")}
        </label>
      </div>
      {list.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
          ))}
        </div>
      ) : list.isError ? (
        <QueryErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isRefetching} />
      ) : list.data.data.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={ImagePlus}
            title={t("media.empty")}
            description={t("media.emptyDescription")}
            primaryAction={{ label: t("media.upload"), onClick: () => setUploadOpen(true), icon: Upload }}
          />
        </div>
      ) : (
        <>
          <MediaGrid items={list.data.data} onSelect={(image) => setDetailId(image.id)} unusedLabel={t("media.unused")} />
          <Pagination
            currentPage={query.page}
            totalRows={list.data.meta.total}
            rowsPerPage={query.limit}
            rowsPerPageOptions={[30, 60, 100]}
            onPageChange={(page) => void setQuery({ page })}
            onRowsPerPageChange={(limit) => void setQuery({ limit, page: 1 })}
            className="px-0"
          />
        </>
      )}
      <UploadMediaDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={(image) => setDetailId(image.id)} />
      <MediaDetailDialog imageId={detailId} onOpenChange={(open) => !open && setDetailId(null)} />
    </PageContainer>
  );
}
