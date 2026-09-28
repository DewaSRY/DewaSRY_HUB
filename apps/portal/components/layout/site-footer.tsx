import { Link } from "@/i18n/navigation";
import { GithubIcon, LinkedinIcon } from "@/components/landing/social-icons";
import { AUTHOR } from "@/components/landing/author";
import { BrandWordmark } from "./brand-logo";

export interface SiteFooterLabels {
  appName: string;
  tagline: string;
  explore: string;
  account: string;
  blog: string;
  products: string;
  about: string;
  signIn: string;
  subscriptions: string;
  transactions: string;
  rights: string;
}

/** Public footer (server component; labels come from the `(site)` layout). */
export function SiteFooter({ labels }: { labels: SiteFooterLabels }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-4">
          <BrandWordmark name={labels.appName} />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{labels.tagline}</p>
          <div className="flex items-center gap-2">
            <a
              href={AUTHOR.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="flex size-9 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              <GithubIcon className="size-4" />
            </a>
            <a
              href={AUTHOR.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="flex size-9 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              <LinkedinIcon className="size-4" />
            </a>
          </div>
        </div>
        <nav aria-label={labels.explore} className="space-y-3 text-sm">
          <p className="font-semibold">{labels.explore}</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/blog">{labels.blog}</Link></li>
            <li><Link className="hover:text-foreground" href="/products">{labels.products}</Link></li>
            <li><Link className="hover:text-foreground" href="/about">{labels.about}</Link></li>
          </ul>
        </nav>
        <nav aria-label={labels.account} className="space-y-3 text-sm">
          <p className="font-semibold">{labels.account}</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/login">{labels.signIn}</Link></li>
            <li><Link className="hover:text-foreground" href="/account/subscriptions">{labels.subscriptions}</Link></li>
            <li><Link className="hover:text-foreground" href="/account/transactions">{labels.transactions}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © {year} {AUTHOR.name}. {labels.rights}
        </p>
      </div>
    </footer>
  );
}
