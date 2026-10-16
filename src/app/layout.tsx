import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "RateProfCuaBan — Nền tảng đánh giá & Tra cứu giảng viên đại học Việt Nam",
  description: "Đánh giá giảng viên. Tra cứu giảng viên đại học toàn quốc. Chọn môn học thông minh. Nền tảng dữ liệu giảng viên uy tín tại các trường đại học trên toàn quốc.",
  keywords: ["đánh giá giảng viên", "tra cứu giáo sư việt nam", "rate my professor vietnam", "bách khoa", "kinh tế quốc dân", "đại học quốc gia"],
  openGraph: {
    title: "RateProfCuaBan — Nền tảng đánh giá & Tra cứu giảng viên đại học Việt Nam",
    description: "Đánh giá giảng viên. Tra cứu giảng viên đại học toàn quốc. Chọn môn học thông minh.",
    type: "website",
    locale: "vi_VN",
    siteName: "RateProfCuaBan",
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
            <main className="flex-1">{children}</main>
            <Footer />
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
