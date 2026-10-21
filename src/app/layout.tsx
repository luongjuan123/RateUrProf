import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://rateurprofs.site"),
  title: "rateurprofs - Đánh giá giảng viên",
  keywords: ["rateurprofs", "RateUrProfs", "đánh giá giảng viên", "tra cứu giáo sư việt nam", "rate my professor vietnam", "bách khoa", "kinh tế quốc dân", "đại học quốc gia"],
  alternates: {
    canonical: "https://rateurprofs.site",
    languages: {
      vi: "https://rateurprofs.site/vi",
      en: "https://rateurprofs.site/en",
      "x-default": "https://rateurprofs.site/vi",
    },
  },
  openGraph: {
    title: "rateurprofs - Đánh giá giảng viên",
    type: "website",
    locale: "vi_VN",
    siteName: "rateurprofs",
  },
  twitter: {
    card: "summary",
    title: "rateurprofs - Đánh giá giảng viên",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

import { I18nProvider } from "@/locales/i18n";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="scroll-smooth">
      <body className="min-h-screen flex flex-col bg-white text-gray-900 antialiased selection:bg-[#e03a3e] selection:text-white">
        <AuthProvider>
          <I18nProvider initialLocale="vi">
            <Navbar />
            <main className="flex-1 overflow-x-clip">{children}</main>
            <Footer />
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
