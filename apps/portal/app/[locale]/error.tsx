"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import ErrorState from "@/components/ui/error-state";

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-xs">
        <ErrorState icon={AlertTriangle} description={t("error.pageDescription")} onRetry={reset}>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            {t("backToHome")}
          </Link>
          {error.digest ? (
            <p className="w-full pt-2 text-xs text-muted-foreground">
              {t("errorReference")}: <code>{error.digest}</code>
            </p>
          ) : null}
        </ErrorState>
      </div>
    </main>
  );
}
