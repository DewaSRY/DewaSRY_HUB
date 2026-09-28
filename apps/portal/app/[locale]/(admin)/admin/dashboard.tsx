"use client";

import { FileText, FolderTree, Image as ImageIcon, Package, Plus, Receipt, Tags, Users, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { useSession } from "@/feature/auth";

const SECTIONS: { href: string; key: string; icon: LucideIcon }[] = [
  { href: "/admin/articles", key: "articles", icon: FileText },
  { href: "/admin/media", key: "media", icon: ImageIcon },
  { href: "/admin/categories", key: "categories", icon: FolderTree },
  { href: "/admin/tags", key: "tags", icon: Tags },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/transactions", key: "transactions", icon: Receipt },
  { href: "/admin/products", key: "products", icon: Package },
];

/** `/admin`: entry points to every admin area. */
export function AdminDashboard() {
  const { t } = useTranslation("admin");
  const { me } = useSession();
  return (
    <PageContainer>
      <PageHeader
        title={t("dashboard.greeting", { name: me?.name?.split(" ")[0] ?? "" })}
        description={t("dashboard.description")}
        actions={
          <Link href="/admin/articles/new" className={buttonVariants()}>
            <Plus aria-hidden />
            {t("articles.new")}
          </Link>
        }
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, key, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full items-start gap-4 rounded-xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="space-y-1">
                <span className="block font-semibold">{t(`dashboard.sections.${key}.title`)}</span>
                <span className="block text-sm text-muted-foreground">{t(`dashboard.sections.${key}.description`)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
