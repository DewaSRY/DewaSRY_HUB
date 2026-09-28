"use client";

import { FileQuestion } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  const { t } = useTranslation("common");
  return (
    <main className="flex min-h-[70vh] flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <FileQuestion className="size-7" aria-hidden />
        </span>
        <p className="mt-6 font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("notFound.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFound.description")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className={buttonVariants()}>
            {t("backToHome")}
          </Link>
          <Link href="/blog" className={buttonVariants({ variant: "outline" })}>
            {t("notFound.readBlog")}
          </Link>
        </div>
      </div>
    </main>
  );
}
