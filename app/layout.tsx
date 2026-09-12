import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CONFIG } from "@/lib/config";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  // Editorial serif fallback per DESIGN.md — Canela/GT Super/PP Editorial New
  // are not available without licensing in this environment.
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${CONFIG.platformName} — Verified karting results, sold as sponsorship`,
  description:
    "Racers turn verified race results into local sponsorship. Tracks get free championship automation. This is a development build with test data only.",
  metadataBase: new URL(`https://${CONFIG.domain}`),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased bg-paper text-ink`}
      >
        {children}
      </body>
    </html>
  );
}
