"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Receipt } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import Pagination from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CopyButton } from "@/components/common/copy-button";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { DEFAULT_TIME_ZONE, formatDate, formatDateTime } from "@/lib/datetime";
import { formatMoney, formatNumber } from "@/lib/number";
import { SubscriptionStatusBadge, TransactionStatusBadge } from "@/feature/billing";
import { useAdminUser, useAdminUserTransactions } from "../hooks";
import type { AdminUser } from "../type";

const TX_PAGE_SIZE = 10;

function initials(name: string | null, email: string): string {
  const source = (name || email).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2)).toUpperCase();
}

/** `/admin/users/[id]` (UC-14): profile, joined products, subscriptions, payment history. Read-only. */
export function UserDetailScreen({ id }: { id: string }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const { data: user, isPending, isError, error, refetch, isRefetching } = useAdminUser(id);

  const back = (
    <Link href="/admin/users" className="hover:text-foreground">
      {t("users.title")}
    </Link>
  );

  if (isPending) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </PageContainer>
    );
  }
  if (isError) {
    return (
      <PageContainer>
        <PageHeader title={t("users.detail.title")} breadcrumbs={[back]} breadcrumbLabel={t("breadcrumb", { ns: "common" })} />
        <QueryErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
      </PageContainer>
    );
  }

  const stats: [string, string][] = [
    [t("users.detail.paidAmount"), formatMoney(user.paymentSummary.paidAmount)],
    [t("users.detail.paidCount"), formatNumber(user.paymentSummary.paidCount)],
    [t("users.detail.lastPaid"), formatDate(user.paymentSummary.lastPaidAt, { locale })],
  ];

  return (
    <PageContainer>
      <PageHeader
        title={user.name || user.email}
        breadcrumbs={[back]}
        breadcrumbLabel={t("breadcrumb", { ns: "common" })}
        titleAddon={<Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{t(`users.role.${user.role}`)}</Badge>}
        actions={
          <Link href={`/admin/transactions?user=${encodeURIComponent(user.id)}`} className={buttonVariants({ variant: "outline" })}>
            <Receipt aria-hidden />
            {t("users.detail.allTransactions")}
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <Card key={label} className="gap-1 px-4 py-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ProfileCard user={user} />
        <div className="space-y-6 lg:col-span-2">
          <ProductsCard user={user} />
          <SubscriptionsCard user={user} />
        </div>
      </div>

      <UserTransactionsCard userId={user.id} />
      <p className="text-xs text-muted-foreground">{t("time.timezoneNote", { ns: "common", zone: DEFAULT_TIME_ZONE })}</p>
    </PageContainer>
  );
}

function ProfileCard({ user }: { user: AdminUser }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const rows: [string, React.ReactNode][] = [
    [
      t("users.detail.email"),
      <span key="email" className="inline-flex min-w-0 items-center gap-1 break-all">
        {user.email}
        <CopyButton value={user.email} label={t("users.detail.copyEmail")} />
      </span>,
    ],
    [
      t("users.detail.userId"),
      <span key="id" className="inline-flex min-w-0 items-center gap-1 font-mono text-xs break-all">
        {user.id}
        <CopyButton value={user.id} label={t("users.detail.copyId")} />
      </span>,
    ],
    [t("users.detail.firebaseUid"), <span key="uid" className="font-mono text-xs break-all">{user.firebaseUid}</span>],
    [t("users.columns.joined"), formatDateTime(user.createdAt, { locale })],
    [t("users.columns.lastSignIn"), formatDateTime(user.lastSignInAt, { locale })],
  ];
  return (
    <Card>
      <CardHeader className="flex items-center gap-3">
        <Avatar className="size-12">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : null}
          <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <CardTitle className="truncate">{user.name || "—"}</CardTitle>
          <CardDescription className="truncate">{t("users.detail.profile")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="min-w-0">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function ProductsCard({ user }: { user: AdminUser }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("users.detail.products")}</CardTitle>
        <CardDescription>{t("users.detail.productsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {user.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("users.detail.noProducts")}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {user.products.map((product) => (
              <li key={product.code} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{product.name}</span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">{product.code}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t("users.detail.joinedAt", { date: formatDate(product.joinedAt, { locale }) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SubscriptionsCard({ user }: { user: AdminUser }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("users.detail.subscriptions")}</CardTitle>
      </CardHeader>
      <CardContent>
        {user.subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("users.detail.noSubscriptions")}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {user.subscriptions.map((subscription) => (
              <li key={subscription.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {subscription.product.name} · {subscription.plan.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(subscription.startDate, { locale })} – {formatDate(subscription.endDate, { locale })}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <SubscriptionStatusBadge subscription={subscription} />
                  {subscription.status === "ACTIVE" && !subscription.entitled ? (
                    <Badge variant="outline">{t("users.detail.notEntitled")}</Badge>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function UserTransactionsCard({ userId }: { userId: string }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const list = useAdminUserTransactions(userId, { page, limit: TX_PAGE_SIZE });
  const href = (orderId: string) => `/admin/transactions/${encodeURIComponent(orderId)}`;

  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>{t("users.detail.transactions")}</CardTitle>
        {list.data?.meta.summary ? (
          <CardDescription>
            {t("transactions.summary.line", {
              count: list.data.meta.summary.count,
              paidCount: list.data.meta.summary.paidCount,
              paidAmount: formatMoney(list.data.meta.summary.paidAmount),
            })}
          </CardDescription>
        ) : null}
        <CardAction>
          <Link href={`/admin/transactions?user=${encodeURIComponent(userId)}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t("users.detail.openInTransactions")}
          </Link>
        </CardAction>
      </CardHeader>
      {list.isPending ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <div className="p-4">
          <QueryErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isRefetching} />
        </div>
      ) : list.data.data.length === 0 ? (
        <EmptyState size="sm" icon={Receipt} title={t("users.detail.noTransactions")} />
      ) : (
        <>
          <Table containerClassName="border-t">
            <TableHeader>
              <TableRow>
                <TableHead>{t("transactions.columns.date")}</TableHead>
                <TableHead>{t("transactions.columns.product")}</TableHead>
                <TableHead className="text-right">{t("transactions.columns.amount")}</TableHead>
                <TableHead>{t("transactions.columns.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={list.isFetching ? "opacity-70" : undefined}>
              {list.data.data.map((tx) => (
                <TableRow key={tx.orderId} isHoverActive className="cursor-pointer" onClick={() => router.push(href(tx.orderId))}>
                  <TableCell className="whitespace-nowrap">
                    <Link href={href(tx.orderId)} className="hover:underline" onClick={(event) => event.stopPropagation()}>
                      {formatDateTime(tx.createdAt, { locale })}
                    </Link>
                    <span className="block font-mono text-[11px] text-muted-foreground">{tx.orderId}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {tx.product.name}
                    <span className="block text-xs text-muted-foreground">{tx.plan.name}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">{formatMoney(tx.price)}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      <TransactionStatusBadge status={tx.status} />
                      {tx.needsReview ? <Badge variant="warning">{t("transactions.needsReview")}</Badge> : null}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            className="border-t"
            currentPage={page}
            totalRows={list.data.meta.total}
            rowsPerPage={TX_PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </Card>
  );
}
