"use client";

import type { ReactNode } from "react";
import {
  FileText,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  Package,
  Receipt,
  Tags,
  Users,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, usePathname } from "@/i18n/navigation";
import { GuardedLink } from "@/components/common/navigation-guard/guarded-link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { LocaleSwitcher } from "@/components/common/locale-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { UserMenu } from "@/feature/auth";
import { BrandWordmark } from "./brand-logo";

const GROUPS = [
  {
    key: "adminNav.overview",
    items: [{ href: "/admin", key: "adminNav.dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    key: "adminNav.content",
    items: [
      { href: "/admin/articles", key: "adminNav.articles", icon: FileText },
      { href: "/admin/media", key: "adminNav.media", icon: ImageIcon },
      { href: "/admin/categories", key: "adminNav.categories", icon: FolderTree },
      { href: "/admin/tags", key: "adminNav.tags", icon: Tags },
    ],
  },
  {
    key: "adminNav.business",
    items: [
      { href: "/admin/users", key: "adminNav.users", icon: Users },
      { href: "/admin/transactions", key: "adminNav.transactions", icon: Receipt },
      { href: "/admin/products", key: "adminNav.products", icon: Package },
    ],
  },
] as const;

function AdminSidebar() {
  const { t } = useTranslation("site");
  const { t: tCommon } = useTranslation("common");
  const pathname = usePathname();
  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<GuardedLink href="/admin" />} aria-label={tCommon("appName")}>
              <BrandWordmark name={tCommon("appName")} tagline={t("adminNav.tagline")} />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup key={group.key}>
            <SidebarGroupLabel>{t(group.key)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active =
                    "exact" in item && item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton isActive={active} render={<GuardedLink href={item.href} />}>
                        <item.icon aria-hidden />
                        <span>{t(item.key)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" render={<Link href="/" target="_blank" />} className="text-sidebar-foreground/70">
              <ExternalLink aria-hidden />
              <span>{t("adminNav.viewSite")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-md md:rounded-t-xl lg:px-6">
      <SidebarTrigger className="-ml-1" />
      <div className="ml-auto flex items-center gap-1">
        <LocaleSwitcher />
        <ThemeToggle />
        <Separator orientation="vertical" className="mx-1.5 data-[orientation=vertical]:h-5" />
        <UserMenu />
      </div>
    </header>
  );
}

const SIDEBAR_STYLE = {
  "--sidebar-width": "calc(var(--spacing) * 64)",
  "--header-height": "calc(var(--spacing) * 14)",
} as React.CSSProperties;

/** Admin dashboard shell: collapsible sidebar + header. */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider style={SIDEBAR_STYLE}>
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AdminShellSkeleton() {
  return (
    <AdminShell>
      <div className="space-y-4 p-6" aria-busy>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="mt-6 h-72 w-full rounded-xl" />
      </div>
    </AdminShell>
  );
}
