"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@/locales/i18n";

export const Footer: React.FC = () => {
  const { locale, t } = useTranslation();

  return (
    <footer className="bg-white text-gray-700 border-t border-gray-300 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black text-white flex items-center justify-center font-black text-xs">
              RP
            </div>
            <span className="font-bold text-sm text-gray-950">RateProfCủaBạn</span>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold">
            <Link href={`/${locale}`} className="text-gray-700 hover:text-black">
              {t("nav.home")}
            </Link>
            <Link href={`/${locale}/professors`} className="text-gray-700 hover:text-black">
              {t("nav.professors")}
            </Link>
            <Link href={`/${locale}/universities`} className="text-gray-700 hover:text-black">
              {t("nav.universities")}
            </Link>
            <Link href={`/${locale}/guidelines`} className="text-gray-700 hover:text-black">
              {t("nav.guidelines")}
            </Link>
            <Link href={`/${locale}/admin`} className="text-gray-500 hover:text-black">
              {t("nav.admin")}
            </Link>
          </nav>
        </div>

        <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500">
          <p>{t("footer.disclaimerText")}</p>
          <p className="shrink-0">{t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
};

