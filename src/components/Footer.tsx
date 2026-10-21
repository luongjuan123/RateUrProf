"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@/locales/i18n";
import { BrandLogo } from "./BrandLogo";

export const Footer: React.FC = () => {
  const { locale, t } = useTranslation();

  return (
    <footer className="bg-white text-gray-800 border-t-2 border-black py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <BrandLogo locale={locale} />

          <nav className="flex flex-wrap items-center gap-2.5 text-xs font-bold uppercase tracking-wider font-mono">
            <Link
              href={`/${locale}`}
              className="px-2 py-0.5 bg-white text-black font-mono font-black text-[11px] uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000] hover:bg-[#e03a3e] hover:text-white transition-all"
            >
              [{t("nav.home")}]
            </Link>
            <Link
              href={`/${locale}/guidelines`}
              className="px-2 py-0.5 bg-[#fef9c3] text-black font-mono font-black text-[11px] uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000] hover:bg-[#e03a3e] hover:text-white transition-all"
            >
              [Site Guidelines]
            </Link>
            <Link
              href={`/${locale}/terms`}
              className="px-2 py-0.5 bg-white text-black font-mono font-black text-[11px] uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000] hover:bg-[#e03a3e] hover:text-white transition-all"
            >
              [Terms of Use]
            </Link>
            <Link
              href={`/${locale}/privacy`}
              className="px-2 py-0.5 bg-[#dbeafe] text-black font-mono font-black text-[11px] uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000] hover:bg-[#e03a3e] hover:text-white transition-all"
            >
              [Privacy Policy]
            </Link>
            <Link
              href={`/${locale}/copyright`}
              className="px-2 py-0.5 bg-[#fed7aa] text-black font-mono font-black text-[11px] uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000] hover:bg-[#e03a3e] hover:text-white transition-all"
            >
              [Copyright Policy]
            </Link>
          </nav>
        </div>

        <div className="pt-4 border-t-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] font-medium text-gray-600 font-mono">
          <p className="max-w-2xl leading-relaxed">
            {t("footer.disclaimerText")}
          </p>
          <p className="shrink-0 font-bold text-black">{t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
};

