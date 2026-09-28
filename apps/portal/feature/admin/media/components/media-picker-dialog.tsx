"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EmptyState from "@/components/ui/empty-state";
import Pagination from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchInput } from "@/components/common/search-input";
import { QueryErrorState } from "@/components/common/query-error-state";
import { useDebounce } from "@/hooks/use-debounce";
import { useMediaList } from "../hooks";
import type { AdminImage } from "../type";
import { MediaGrid } from "./media-grid";
import { UploadMediaPanel } from "./upload-media-dialog";

const LIMIT = 20;

/**
 * Media picker (ADR-009 §5.4): the `/admin/media` list as a dialog (search,
 * paging, thumbnails) plus an Upload tab. Used for the cover image and for
 * image blocks in the editor.
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  onPick,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (image: AdminImage) => void;
  title?: string;
}) {
  const { t } = useTranslation("admin");
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminImage | null>(null);
  const q = useDebounce(search, 300);
  const list = useMediaList({ q: q || undefined, page, limit: LIMIT }, { enabled: open });

  function pick(image: AdminImage) {
    onPick(image);
    onOpenChange(false);
    setSelected(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title ?? t("media.pickerTitle")}</DialogTitle>
          <DialogDescription>{t("media.pickerDescription")}</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(value) => setTab(value as "library" | "upload")}>
          <TabsList>
            <TabsTrigger value="library">{t("media.library")}</TabsTrigger>
            <TabsTrigger value="upload">{t("media.upload")}</TabsTrigger>
          </TabsList>
          <TabsContent value="library" className="space-y-4 pt-3">
            <SearchInput
              search={search}
              onSearch={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={t("media.searchPlaceholder")}
            />
            <div className="max-h-[50vh] min-h-48 overflow-y-auto pr-1">
              {list.isPending ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
                  ))}
                </div>
              ) : list.isError ? (
                <QueryErrorState error={list.error} onRetry={() => list.refetch()} />
              ) : list.data.data.length ? (
                <MediaGrid items={list.data.data} selectedId={selected?.id} onSelect={setSelected} />
              ) : (
                <EmptyState size="sm" icon={ImagePlus} title={t("media.empty")} description={t("media.emptyPickerDescription")} />
              )}
            </div>
            {list.data && list.data.meta.total > LIMIT ? (
              <Pagination
                currentPage={page}
                totalRows={list.data.meta.total}
                rowsPerPage={LIMIT}
                rowsPerPageOptions={[LIMIT]}
                onPageChange={setPage}
                className="px-0"
              />
            ) : null}
          </TabsContent>
          <TabsContent value="upload" className="pt-3">
            {open && tab === "upload" ? <UploadMediaPanel onUploaded={pick} /> : null}
          </TabsContent>
        </Tabs>
        {tab === "library" ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel", { ns: "common" })}
            </Button>
            <Button onClick={() => selected && pick(selected)} disabled={!selected}>
              {t("media.insert")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
