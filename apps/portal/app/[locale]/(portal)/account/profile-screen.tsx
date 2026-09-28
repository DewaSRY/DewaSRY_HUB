"use client";

import { ExternalLink, Package } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineAlert } from "@/components/common/inline-alert";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { GOOGLE_ACCOUNT_URL, initials, useMe } from "@/feature/auth";
import { formatDate, formatDateTime } from "@/lib/datetime";

/** `/account` (UC-05): read-only profile from `GET /me`. */
export function ProfileScreen() {
  const { t } = useTranslation("auth");
  const { locale } = useParams<{ locale: string }>();
  const { data: me, isPending, isError, error, refetch, isRefetching } = useMe();

  return (
    <div className="space-y-6">
      <PageHeader title={t("account.title")} description={t("account.description")} />
      {isPending ? (
        <Card>
          <CardContent className="flex items-center gap-4 py-2">
            <Skeleton className="size-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </CardContent>
        </Card>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} title={t("account.loadFailed")} />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <Avatar className="size-16" size="lg">
                {me.avatarUrl ? <AvatarImage src={me.avatarUrl} alt="" referrerPolicy="no-referrer" /> : null}
                <AvatarFallback className="text-lg">{initials(me.name, me.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-semibold">{me.name ?? me.email}</h2>
                  <Badge variant={me.role === "ADMIN" ? "default" : "secondary"}>{t(`account.roles.${me.role}`)}</Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">{me.email}</p>
              </div>
              <a href={GOOGLE_ACCOUNT_URL} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>
                {t("account.editInGoogle")}
                <ExternalLink aria-hidden />
              </a>
            </CardContent>
            <CardContent>
              <dl className="grid gap-4 border-t pt-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">{t("account.email")}</dt>
                  <dd className="mt-0.5 truncate font-medium">{me.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("account.memberSince")}</dt>
                  <dd className="mt-0.5 font-medium">{formatDate(me.createdAt, { locale })}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("account.lastSignIn")}</dt>
                  <dd className="mt-0.5 font-medium">{formatDateTime(me.lastSignInAt, { locale })}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <InlineAlert variant="info">{t("account.googleNotice")}</InlineAlert>

          <Card>
            <CardHeader>
              <CardTitle>{t("account.products")}</CardTitle>
              <CardDescription>{t("account.productsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {me.products.length ? (
                <ul className="divide-y rounded-lg border">
                  {me.products.map((product) => (
                    <li key={product.code} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Package className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/products/${product.code}`} className="font-medium hover:underline">
                          {product.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {t("account.joinedOn", { date: formatDate(product.joinedAt, { locale }) })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  {t("account.noProducts")}
                  <Link href="/products" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {t("account.browseProducts")}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
