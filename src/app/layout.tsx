import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { PageBackdrop } from "@/components/page-backdrop";
import { DmedChat } from "@/components/dmed-chat";
import { VisitPulse } from "@/components/visit-pulse";
import { htmlLang } from "@/lib/locale";
import { getLocale } from "@/lib/locale-server";
import { BRAND_APPLE_ICON, BRAND_FAVICON, BRAND_FAVICON_16, BRAND_LOGO, BRAND_MANIFEST, BRAND_NAME } from "@/lib/brand";
import { canonicalOrigin } from "@/lib/site";
import "./globals.css";
import { UiLocaleProvider } from "@/components/ui-locale";

const publishedOrigin = canonicalOrigin();

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  weight: ["600"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  ...(publishedOrigin ? { metadataBase: new URL(publishedOrigin) } : {}),
  title: {
    default: BRAND_NAME,
    template: `%s · ${BRAND_NAME}`,
  },
  description: "DMED o‘quv materiallari portali. Darslar va videolar ochiq.",
  applicationName: BRAND_NAME,
  keywords: [BRAND_NAME, "o‘quv materiallari", "o'zbekiston"],
  authors: [{ name: BRAND_NAME }],
  creator: BRAND_NAME,
  ...(publishedOrigin ? { alternates: { canonical: publishedOrigin } } : {}),
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    ...(publishedOrigin ? { url: publishedOrigin } : {}),
    siteName: BRAND_NAME,
    title: BRAND_NAME,
    description: "DMED o‘quv materiallari portali.",
    images: [
      {
        url: BRAND_LOGO,
        width: 80,
        height: 80,
        alt: BRAND_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description: "DMED o‘quv materiallari portali",
    images: [BRAND_LOGO],
  },
  manifest: BRAND_MANIFEST,
  icons: {
    icon: [
      { url: "/favicon.ico?v=mark5", sizes: "any" },
      { url: BRAND_FAVICON, sizes: "32x32", type: "image/png" },
      { url: BRAND_FAVICON_16, sizes: "16x16", type: "image/png" },
    ],
    apple: BRAND_APPLE_ICON,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html
      lang={htmlLang(locale)}
      data-locale={locale}
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col font-sans text-[#071a38]">
        <UiLocaleProvider locale={locale}>
        <PageBackdrop />
        <div className="page-shell">{children}</div>
        <DmedChat locale={locale} />
        <VisitPulse />
        </UiLocaleProvider>
      </body>
    </html>
  );
}
