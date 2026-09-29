"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUnsavedChangesWarning } from "./use-unsaved-changes-warning";
import { useNavigationGuardStore } from "./store";

/**
 * Mounted once near the app root. Renders the one shared "unsaved changes"
 * dialog, arms the native `beforeunload` prompt whenever the store is
 * guarded, and intercepts browser back/forward via `popstate`.
 */
export function NavigationGuardProvider() {
  const { t } = useTranslation("common");
  const isGuarded = useNavigationGuardStore((s) => s.isGuarded);
  const options = useNavigationGuardStore((s) => s.options);
  const pendingNavigation = useNavigationGuardStore((s) => s.pendingNavigation);
  const confirmLeave = useNavigationGuardStore((s) => s.confirmLeave);
  const cancelLeave = useNavigationGuardStore((s) => s.cancelLeave);
  const router = useRouter();

  useUnsavedChangesWarning(isGuarded);

  const allowNextPopRef = useRef(false);
  const restoringSentinelRef = useRef(false);

  useEffect(() => {
    // Next.js's App Router has its own popstate listener that renders the
    // destination route independently of the raw History API — by the time
    // our handler below could react and push the URL back, Next has already
    // swapped in the other page underneath. So the guard can't fight a
    // *different* route after the fact; instead, the moment it arms, it
    // pushes a duplicate of the current entry. The first back press then
    // only ever traverses between two identical URLs (harmless for Next to
    // re-render) until the user actually confirms leaving.
    if (!isGuarded) return;
    window.history.pushState(null, "", window.location.href);
  }, [isGuarded]);

  useEffect(() => {
    // Any same-site link on the page respects the guard, not only
    // `GuardedLink`: public pages render plain `Link`s (nav, footer,
    // breadcrumbs, related articles). Capture phase runs before Next's own
    // click handler, which skips navigation once `defaultPrevented` is set.
    const handleClick = (event: MouseEvent) => {
      if (!useNavigationGuardStore.getState().isGuarded) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // In-page anchors (table of contents, heading links) do not leave the page.
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;

      event.preventDefault();
      const destination = `${url.pathname}${url.search}${url.hash}`;
      useNavigationGuardStore.getState().requestNavigation(() => router.push(destination));
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [router]);

  useEffect(() => {
    const handlePopState = () => {
      if (allowNextPopRef.current) {
        allowNextPopRef.current = false;
        return;
      }
      if (restoringSentinelRef.current) {
        restoringSentinelRef.current = false;
        return;
      }

      const state = useNavigationGuardStore.getState();
      if (!state.isGuarded) return;

      // Undo the pop by moving forward onto the sentinel entry we already
      // pushed, rather than pushing yet another duplicate — that way
      // repeated cancels never pile up extra history entries.
      restoringSentinelRef.current = true;
      window.history.forward();

      state.requestNavigation(() => {
        allowNextPopRef.current = true;
        // Two steps back: past the sentinel entry, and past the real entry
        // it duplicated, landing on whatever preceded it.
        window.history.go(-2);
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const hideCancelButton = options?.hideCancelButton ?? false;

  return (
    <Dialog
      open={pendingNavigation !== null}
      onOpenChange={(open) => {
        if (!open) cancelLeave();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {options?.title ?? t("unsavedChangesTitle")}
          </DialogTitle>
          <DialogDescription>
            {options?.description ?? t("unsavedChangesDescription")}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          {!hideCancelButton && (
            <Button type="button" variant="outline" onClick={cancelLeave}>
              {options?.cancelLabel ?? t("cancel")}
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            onClick={hideCancelButton ? cancelLeave : confirmLeave}
          >
            {options?.confirmLabel ?? t("leave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
