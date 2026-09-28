"use client";

import { LayoutDashboard, LogOut, UserRound, CreditCard, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "../session-store";
import { initials } from "../utils";

/** Avatar menu for the portal / admin shells. */
export function UserMenu() {
  const { t } = useTranslation("auth");
  const { status, me, firebaseUser, isAdmin } = useSession();

  if (status === "loading") return <Skeleton className="size-8 rounded-full" />;
  if (status !== "signed-in") {
    return (
      <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        {t("signIn")}
      </Link>
    );
  }

  const name = me?.name ?? firebaseUser?.displayName ?? null;
  const email = me?.email ?? firebaseUser?.email ?? null;
  const avatar = me?.avatarUrl ?? firebaseUser?.photoURL ?? undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={t("accountMenu")}
      >
        <Avatar className="size-8">
          {avatar ? <AvatarImage src={avatar} alt="" referrerPolicy="no-referrer" /> : null}
          <AvatarFallback>{initials(name, email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">{name ?? email}</span>
            {name && email ? <span className="truncate text-xs font-normal text-muted-foreground">{email}</span> : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/account" />}>
          <UserRound aria-hidden /> {t("profile")}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/subscriptions" />}>
          <CreditCard aria-hidden /> {t("subscriptions")}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/transactions" />}>
          <Receipt aria-hidden /> {t("transactions")}
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <LayoutDashboard aria-hidden /> {t("adminDashboard")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/logout" />}>
          <LogOut aria-hidden /> {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
