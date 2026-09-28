import "server-only";
import { getTranslation } from "@/i18n/server";
import type { AppLocale } from "@/i18n/settings";
import type { ArticleBodyLabels } from "@/feature/content";
import type { PlanCardLabels } from "@/feature/product";

/** Translated label bundles for the props-driven content/product components. */
export async function siteLabels(locale: AppLocale) {
  const { t: tContent } = await getTranslation(locale, "content");
  const { t: tProduct } = await getTranslation(locale, "product");
  const { t: tCommon } = await getTranslation(locale, "common");

  const pagination = {
    nav: tCommon("pagination"),
    previous: tCommon("previousPage"),
    next: tCommon("nextPage"),
    page: (n: number) => tCommon("pageNumber", { page: n }),
  };

  const body: ArticleBodyLabels = {
    copy: tContent("body.copy"),
    copied: tContent("body.copied"),
    codeLanguage: tContent("body.codeLanguage"),
    plainText: tContent("body.plainText"),
    loadEmbed: tContent("body.loadEmbed"),
    embedNotice: tContent("body.embedNotice"),
    opensInNewTab: tContent("body.opensInNewTab"),
    callout: {
      info: tContent("body.callout.info"),
      tip: tContent("body.callout.tip"),
      warning: tContent("body.callout.warning"),
      danger: tContent("body.callout.danger"),
    },
    headingAnchor: tContent("body.headingAnchor"),
    advertisement: tContent("body.advertisement"),
    taskDone: tContent("body.taskDone"),
    taskTodo: tContent("body.taskTodo"),
  };

  const price = {
    free: tProduct("price.free"),
    perMonth: tProduct("price.perMonth"),
    perYear: tProduct("price.perYear"),
  };

  const plan: PlanCardLabels = {
    ...price,
    oneTime: tProduct("plan.oneTime"),
    buy: tProduct("plan.buy"),
    useFree: tProduct("plan.useFree"),
    popular: tProduct("plan.popular"),
    featureLabel: (key: string) => {
      const label = tProduct(`features.${key}`, { defaultValue: "" });
      return label;
    },
  };

  const productCard = {
    ...price,
    learnMore: tProduct("card.learnMore"),
    getStarted: tProduct("card.getStarted"),
    details: tProduct("card.details"),
    from: tProduct("card.from"),
    plans: (count: number) => tProduct("card.plans", { count }),
  };

  return { tContent, tProduct, tCommon, pagination, body, plan, productCard };
}
