import { ArrowRight, BookOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { GithubIcon, LinkedinIcon } from "./social-icons";
import { AUTHOR } from "./author";

export interface HeroLabels {
  badge: string;
  title: string;
  highlight: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  stackLabel: string;
}

const STACK = ["Next.js", "React", "TypeScript", "Spring Boot", "Java", "Go", "PostgreSQL", "AWS", "Cloudflare", "Terraform"];

/** Home hero: who Dewa is, and the two paths (blog, products). Static markup, no JS. */
export function HeroSection({ labels }: { labels: HeroLabels }) {
  return (
    <section className="relative overflow-hidden border-b">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_20%_-10%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent),radial-gradient(40rem_24rem_at_90%_10%,color-mix(in_oklch,var(--info)_12%,transparent),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div className="space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            {labels.badge}
          </span>
          <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {labels.title} <span className="text-primary">{labels.highlight}</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">{labels.description}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/blog" className={buttonVariants({ size: "lg" })}>
              <BookOpen aria-hidden />
              {labels.primaryCta}
            </Link>
            <Link href="/products" className={buttonVariants({ size: "lg", variant: "outline" })}>
              {labels.secondaryCta}
              <ArrowRight aria-hidden />
            </Link>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <a href={AUTHOR.githubUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hover:text-foreground">
              <GithubIcon className="size-5" />
            </a>
            <a href={AUTHOR.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-foreground">
              <LinkedinIcon className="size-5" />
            </a>
            <span className="text-sm">{AUTHOR.githubLabel}</span>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-2xl border bg-card/90 p-6 shadow-xl ring-1 ring-foreground/5 backdrop-blur">
            <div className="mb-4 flex items-center gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-destructive/60" />
              <span className="size-2.5 rounded-full bg-warning/70" />
              <span className="size-2.5 rounded-full bg-success/70" />
            </div>
            <pre className="overflow-x-auto font-mono text-[13px] leading-relaxed text-muted-foreground">
              <code>
                <span className="text-primary">const</span> dewa = {"{"}
                {"\n  "}role: <span className="text-success">&quot;Full-stack developer&quot;</span>,
                {"\n  "}based: <span className="text-success">&quot;Indonesia&quot;</span>,
                {"\n  "}ships: [<span className="text-success">&quot;web&quot;</span>, <span className="text-success">&quot;APIs&quot;</span>, <span className="text-success">&quot;infra&quot;</span>],
                {"\n  "}writes: <span className="text-success">&quot;/blog&quot;</span>,
                {"\n"}{"}"};
              </code>
            </pre>
            <p className="mt-5 mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{labels.stackLabel}</p>
            <ul className="flex flex-wrap gap-1.5">
              {STACK.map((item) => (
                <li key={item} className="rounded-md border bg-muted/50 px-2 py-0.5 text-xs font-medium">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
