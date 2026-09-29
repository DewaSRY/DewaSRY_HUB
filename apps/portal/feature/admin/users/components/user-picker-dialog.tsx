"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EmptyState from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/common/query-error-state";
import { SearchInput } from "@/components/common/search-input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useAdminUsers } from "../hooks";
import type { AdminUserSummary } from "../type";

/** Search users by name or email and pick one (e.g. the "User" filter on `/admin/transactions`). */
export function UserPickerDialog({
  open,
  onOpenChange,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId?: string | null;
  onSelect: (user: AdminUserSummary) => void;
}) {
  const { t } = useTranslation("admin");
  const [search, setSearch] = useState("");
  const q = useDebounce(search, 300);
  const list = useAdminUsers({ q: q || undefined, limit: 10, sort: "lastSignInAt,desc" }, { enabled: open });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("users.picker.title")}</DialogTitle>
          <DialogDescription>{t("users.picker.description")}</DialogDescription>
        </DialogHeader>
        <SearchInput search={search} onSearch={setSearch} placeholder={t("users.search")} autoFocus />
        {list.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : list.isError ? (
          <QueryErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isRefetching} />
        ) : list.data.data.length === 0 ? (
          <EmptyState size="sm" icon={Users} title={t("users.noMatch")} />
        ) : (
          <ul className={cn("max-h-80 divide-y overflow-y-auto rounded-lg border", list.isFetching && "opacity-70")}>
            {list.data.data.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  onClick={() => {
                    onSelect(user);
                    onOpenChange(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{user.name || user.email}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                  </span>
                  {user.id === selectedId ? <Check className="size-4 shrink-0 text-primary" aria-hidden /> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
