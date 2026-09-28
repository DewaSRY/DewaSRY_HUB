import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Mail } from "lucide-react";
import { isAppLocale, localeParams } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/components/common/json-ld";
import { SectionHeading } from "@/components/landing/section-heading";
import { SkillsGrid } from "@/components/landing/skills-section";
import { GithubIcon, LinkedinIcon } from "@/components/landing/social-icons";
import { AUTHOR } from "@/components/landing/author";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { personJsonLd } from "@/lib/seo/json-ld";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "site");
  return buildPageMetadata({ locale, path: "/about", title: t("about.metaTitle"), description: t("about.metaDescription") });
}

const PROJECTS = [
  { key: "hub", href: "/", stack: ["Next.js 16", "Spring Boot", "PostgreSQL", "Firebase Auth", "Midtrans", "Cloudflare Workers"] },
  { key: "documentDoctor", href: "/products/document-doctor", stack: ["React", "TypeScript", "Hub SSO"] },
  { key: "simpleBank", href: "https://github.com/DewaSRY/simple_bank_golang", stack: ["Go", "PostgreSQL", "Next.js"] },
] as const;

const TIMELINE = ["one", "two", "three", "four"] as const;

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  const { t } = await getTranslation(locale, "site");

  const skills = (["frontend", "backend", "data", "cloud", "security", "craft"] as const).map((key) => ({
    title: t(`skills.${key}.title`),
    description: t(`skills.${key}.description`),
  }));

  return (
    <>
      <JsonLd data={personJsonLd()} />
      <section className="border-b bg-[radial-gradient(50rem_20rem_at_10%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold tracking-wide text-primary">{t("about.eyebrow")}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{t("about.title")}</h1>
            <p className="text-lg leading-relaxed text-muted-foreground text-pretty">{t("about.intro")}</p>
            <p className="leading-relaxed text-muted-foreground text-pretty">{t("about.body")}</p>
            <div className="flex flex-wrap gap-3">
              <a href={`mailto:${AUTHOR.email}`} className={buttonVariants({ size: "lg" })}>
                <Mail aria-hidden />
                {t("about.contact")}
              </a>
              <a href={AUTHOR.githubUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "lg", variant: "outline" })}>
                <GithubIcon className="size-4" />
                GitHub
              </a>
              <a href={AUTHOR.linkedinUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "lg", variant: "outline" })}>
                <LinkedinIcon className="size-4" />
                LinkedIn
              </a>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {(["focus", "stack", "location", "writing"] as const).map((key) => (
              <div key={key} className="rounded-2xl border bg-card p-5 shadow-xs">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(`about.facts.${key}.label`)}</dt>
                <dd className="mt-1.5 font-semibold">{t(`about.facts.${key}.value`)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-20 sm:px-6">
        <SectionHeading eyebrow={t("about.skillsEyebrow")} title={t("home.skills.title")} description={t("home.skills.description")} />
        <SkillsGrid items={skills} />
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-20 sm:px-6">
          <SectionHeading eyebrow={t("about.portfolioEyebrow")} title={t("about.portfolioTitle")} description={t("about.portfolioDescription")} />
          <ul className="grid gap-6 lg:grid-cols-3">
            {PROJECTS.map((project) => {
              const external = project.href.startsWith("http");
              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold">{t(`about.projects.${project.key}.title`)}</h3>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t(`about.projects.${project.key}.description`)}</p>
                  <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    {project.stack.map((item) => (
                      <li key={item} className="rounded-md border bg-muted/50 px-2 py-0.5 text-xs font-medium">
                        {item}
                      </li>
                    ))}
                  </ul>
                </>
              );
              const className = "group flex h-full flex-col gap-3 rounded-2xl border bg-card p-6 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md";
              return (
                <li key={project.key}>
                  {external ? (
                    <a href={project.href} target="_blank" rel="noopener noreferrer" className={className}>
                      {content}
                    </a>
                  ) : (
                    <Link href={project.href} className={className}>
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl space-y-8 px-4 py-20 sm:px-6">
        <SectionHeading eyebrow={t("about.approachEyebrow")} title={t("about.approachTitle")} />
        <ol className="relative space-y-8 border-l pl-6">
          {TIMELINE.map((key, index) => (
            <li key={key} className="relative">
              <span className="absolute top-0.5 -left-[33px] flex size-5 items-center justify-center rounded-full border bg-background font-mono text-[10px] font-semibold text-primary">
                {index + 1}
              </span>
              <h3 className="font-semibold">{t(`about.approach.${key}.title`)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(`about.approach.${key}.description`)}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
