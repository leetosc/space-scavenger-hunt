import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";
import StarfieldBackground from "@/components/starfield-background";
import { createPageMetadata, SITE_DESCRIPTION, SITE_NAME } from "@/lib/page-metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_SERVER_URL
    : "http://localhost:3001");

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Luke & Leo's First Birthday",
    description: SITE_DESCRIPTION,
    path: "/",
  }),
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: `Luke & Leo's First Birthday | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-svh bg-background text-foreground relative overflow-x-hidden`}>
        <Providers>
          <div className="relative flex min-h-svh w-full flex-col z-0">
            <StarfieldBackground />
            <div className="relative z-10 flex min-h-svh w-full flex-col">
              <Header />
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto w-full">
                {children}
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
