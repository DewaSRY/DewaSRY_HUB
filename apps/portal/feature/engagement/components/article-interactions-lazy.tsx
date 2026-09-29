"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { InteractionsSkeleton } from "./interactions-skeleton";

// ADR-010 §8.1: the island, and with it Firebase and the comment box, loads
// only on the client and only when the reader scrolls near it — never in the
// ISR HTML and never before LCP.
const ArticleInteractions = dynamic(() => import("./article-interactions"), {
  ssr: false,
  loading: () => <InteractionsSkeleton />,
});

const MOUNT_MARGIN = "600px 0px";

/** Votes and comments under an article (UC-22 to UC-25). The page passes only ids. */
export function ArticleInteractionsLazy({ articleId, slug }: { articleId: string; slug: string }) {
  const { t } = useTranslation("engagement");
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: MOUNT_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <section ref={ref} id="discussion" aria-labelledby="discussion-heading" className="min-h-88 scroll-mt-24 space-y-6">
      <h2 id="discussion-heading" className="text-2xl font-semibold tracking-tight">
        {t("section.title")}
      </h2>
      {visible ? <ArticleInteractions articleId={articleId} slug={slug} /> : <InteractionsSkeleton />}
    </section>
  );
}
