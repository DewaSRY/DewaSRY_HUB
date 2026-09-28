"use client";

import { useTranslation } from "react-i18next";
import { toApiError } from "@/lib/api/error";
import { InlineAlert } from "./inline-alert";

/**
 * In-flow message for a failed mutation: the API `message`, any `error[]`
 * items that did not map to a form field, and the `X-Trace-Id`.
 */
export function ApiErrorAlert({
  error,
  title,
  extra,
  className,
}: {
  error: unknown;
  title?: string;
  extra?: string[];
  className?: string;
}) {
  const { t } = useTranslation("common");
  const apiError = toApiError(error);
  if (!error) return null;
  const message =
    apiError?.status === 0 ? t("error.network") : (apiError?.body?.message ?? t("error.description"));
  return (
    <InlineAlert title={title ?? message} className={className}>
      {title ? <p>{message}</p> : null}
      {extra?.length ? (
        <ul className="list-disc pl-4">
          {extra.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {apiError?.traceId ? (
        <p className="text-xs opacity-80">
          {t("traceId")}: <code className="font-mono">{apiError.traceId}</code>
        </p>
      ) : null}
    </InlineAlert>
  );
}
