"use client";

import type { ReactNode } from "react";
import { CloudOff, FileQuestion, ServerCrash, ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";
import ErrorState from "@/components/ui/error-state";
import { toApiError } from "@/lib/api/error";
import { cn } from "@/lib/utils";

/**
 * Error state for a failed query. It branches on the HTTP status (never on
 * the message text, ADR-003 §3.5) and shows the `X-Trace-Id` so the user can
 * quote it.
 */
export function QueryErrorState({
  error,
  onRetry,
  retrying,
  title,
  className,
  children,
}: {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  title?: string;
  className?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation("common");
  const apiError = toApiError(error);
  const status = apiError?.status;

  const variant =
    status === 0
      ? { icon: CloudOff, description: t("error.network") }
      : status === 403
        ? { icon: ShieldX, description: t("error.forbidden") }
        : status === 404
          ? { icon: FileQuestion, description: t("error.notFound") }
          : status === 409
            ? { icon: ServerCrash, description: t("error.conflict") }
            : status && status >= 500
              ? { icon: ServerCrash, description: t("error.server") }
              : { icon: ServerCrash, description: apiError?.body?.message ?? t("error.description") };

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      <ErrorState
        icon={variant.icon}
        title={title}
        description={variant.description}
        onRetry={status === 403 || status === 404 ? undefined : onRetry}
        retrying={retrying}
      >
        {children}
        {apiError?.traceId ? (
          <p className="w-full pt-1 text-xs text-muted-foreground">
            {t("traceId")}: <code className="font-mono">{apiError.traceId}</code>
          </p>
        ) : null}
      </ErrorState>
    </div>
  );
}
