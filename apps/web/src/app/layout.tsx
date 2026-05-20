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

export const metadata: Metadata = {
  title: "space-scavenger-hunt",
  description: "space-scavenger-hunt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
