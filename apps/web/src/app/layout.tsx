import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";
import StarfieldBackground from "@/components/starfield-background";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteDescription =
  "The Starfarer-9 has suffered a critical hull failure. Enlist with your team, decrypt sector logs, and rescue stranded astronauts before life support systems fail.";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_SERVER_URL
    : "http://localhost:3001");

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: "Space Scavenger Hunt",
    template: "%s | Space Scavenger Hunt",
  },
  description: siteDescription,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Space Scavenger Hunt",
    description: siteDescription,
    siteName: "Space Scavenger Hunt",
    url: "/",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/spacelogo.png",
        alt: "Space Scavenger Hunt",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Space Scavenger Hunt",
    description: siteDescription,
    images: ["/spacelogo.png"],
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
          <div className="relative min-h-svh w-full overflow-hidden flex flex-col z-0">
            <StarfieldBackground />
            <div className="relative z-10 grid grid-rows-[auto_1fr] h-svh w-full overflow-hidden">
              <Header />
              <div className="overflow-y-auto w-full min-h-0 flex flex-col">
                {children}
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
