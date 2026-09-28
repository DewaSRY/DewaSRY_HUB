import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { localeParams, isAppLocale } from "@/i18n/settings";
import { getMessages } from "@/i18n/server";
import { TranslationsProvider } from "@/providers/translations-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { InlineScript } from "@/components/common/inline-script";
import { TopProgressBar } from "@/components/common/top-progress-bar";
import { NavigationGuardProvider } from "@/components/common/navigation-guard/provider";
import { ToastViewport } from "@/components/common/toast-viewport";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE_NAME, SITE_URL } from "@/lib/seo/metadata";
import "../globals.css";

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme")||"system";var d=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var e=document.documentElement;if(d==="dark"){e.classList.add("dark")}else{e.classList.remove("dark")}e.style.colorScheme=d}catch(e){}})()`;

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description:
    "Dewa Surya Ariesta — full-stack developer. Articles, tutorials, and the SaaS products of the Dewa Surya Hub.",
  applicationName: SITE_NAME,
  authors: [{ name: "Dewa Surya Ariesta", url: "https://github.com/DewaSRY" }],
  creator: "Dewa Surya Ariesta",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#16181d" },
  ],
};

export function generateStaticParams() {
  return localeParams();
}

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();

  const messages = await getMessages(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="flex min-h-full flex-col">
        <NuqsAdapter>
          <ThemeProvider>
            <TranslationsProvider locale={locale} messages={messages}>
              <QueryProvider>
                <TooltipProvider>
                  <TopProgressBar />
                  {children}
                  <NavigationGuardProvider />
                  <ToastViewport />
                </TooltipProvider>
              </QueryProvider>
            </TranslationsProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
