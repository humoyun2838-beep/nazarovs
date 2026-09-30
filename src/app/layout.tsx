import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { PageBackdrop } from "@/components/page-backdrop";
import { DmedChat } from "@/components/dmed-chat";
import "./globals.css";

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
  metadataBase: new URL("https://www.nazarov.uz"),
  title: {
    default: "Nazarov Humoyun Mirzo",
    template: "%s · Nazarov Humoyun Mirzo",
  },
  description:
    "Nazarov Humoyun Mirzo o‘quv materiallari portali. DMED darslari va videolar ochiq.",
  applicationName: "Nazarov Humoyun Mirzo",
  keywords: [
    "Nazarov",
    "Humoyun Mirzo",
    "nazarov.uz",
    "www.nazarov.uz",
    "o‘quv materiallari",
    "o'zbekiston",
  ],
  authors: [{ name: "Nazarov Humoyun Mirzo", url: "https://www.nazarov.uz" }],
  creator: "Nazarov Humoyun Mirzo",
  alternates: {
    canonical: "https://www.nazarov.uz",
  },
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: "https://www.nazarov.uz",
    siteName: "Nazarov Humoyun Mirzo",
    title: "Nazarov Humoyun Mirzo",
    description:
      "O‘quv materiallari portali. Mijozlar darhol materiallarni ochadi.",
    images: [
      {
        url: "/nazarov-portrait.webp?v=hq1",
        width: 640,
        height: 640,
        alt: "Nazarov Humoyun Mirzo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nazarov Humoyun Mirzo",
    description: "O‘quv materiallari portali",
    images: ["/nazarov-portrait.webp?v=hq1"],
  },
  icons: {
    icon: "/nazarov-portrait-sm.webp?v=hq1",
    apple: "/nazarov-portrait.webp?v=hq1",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uz"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="preload"
          href="/nazarov-bg-wash.webp?v=dmed4"
          as="image"
          type="image/webp"
        />
      </head>
      <body className="relative flex min-h-full flex-col font-sans text-[#071a38]">
        <PageBackdrop />
        <div className="page-shell">{children}</div>
        <DmedChat />
      </body>
    </html>
  );
}
