"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Pencil, Plus, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/number";
import type { AdminPlan, AdminProduct } from "../type";
import { PlanFormDialog } from "./plan-form-dialog";

/** Plans of one product: price, billing period, visibility, sold lock. */
export function PlansCard({ product }: { product: AdminProduct }) {
  const { t } = useTranslation("admin");
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [open, setOpen] = useState(false);

  const openPlan = (plan: AdminPlan | null) => {
    setEditing(plan);
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("products.plans.title")}</CardTitle>
        <CardDescription>{t("products.plans.description")}</CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => openPlan(null)}>
            <Plus aria-hidden />
            {t("products.plans.new")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {product.plans.length === 0 ? (
          <EmptyState
            size="sm"
            icon={Tag}
            title={t("products.plans.empty")}
            description={t("products.plans.emptyDescription")}
            className="rounded-lg border border-dashed"
          />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("products.plans.columns.plan")}</TableHead>
                  <TableHead className="text-right">{t("products.plans.columns.price")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("products.plans.columns.period")}</TableHead>
                  <TableHead>{t("products.plans.columns.status")}</TableHead>
                  <TableHead className="hidden text-right md:table-cell">{t("products.plans.columns.subscribers")}</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">{t("actions", { ns: "common" })}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.plans.map((plan) => (
                  <TableRow key={plan.id} className={plan.active ? undefined : "text-muted-foreground"}>
                    <TableCell className="max-w-[16rem]">
                      <span className="block truncate font-medium">{plan.name}</span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">{plan.code}</span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      {plan.price.amount === 0 ? t("products.period.free") : formatMoney(plan.price)}
                      <span className="block text-xs text-muted-foreground sm:hidden">
                        {plan.billingPeriod ? t(`products.period.${plan.billingPeriod}`) : null}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {plan.billingPeriod ? t(`products.period.${plan.billingPeriod}`) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={plan.active ? "success" : "secondary"}>
                          {plan.active ? t("products.status.active") : t("products.status.inactive")}
                        </Badge>
                        {!plan.public ? <Badge variant="outline">{t("products.plans.hidden")}</Badge> : null}
                        {plan.sold ? (
                          <Badge variant="outline" title={t("products.plans.soldDescription")}>
                            <Lock aria-hidden />
                            {t("products.plans.sold")}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">{plan.activeSubscriptions}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openPlan(plan)}
                        aria-label={t("products.plans.editTitle", { name: plan.name })}
                      >
                        <Pencil aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <PlanFormDialog productId={product.id} plans={product.plans} plan={editing} open={open} onOpenChange={setOpen} />
    </Card>
  );
}
