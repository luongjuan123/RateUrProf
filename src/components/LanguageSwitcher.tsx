"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation, Locale, supportedLocales } from "@/locales/i18n";
import { PopArtGlobe } from "@/components/icons/PopArtIcons";

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = "" }) => {
  const { locale, setLocale, t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLanguageChange = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // 1. Update in-memory i18n context & cookies
    setLocale(newLocale);

    // 2. Compute new localized URL preserving path, route parameters, and query string
    if (pathname) {
      const segments = pathname.split("/").filter(Boolean);
      let newPath: string;

      if (segments.length > 0 && supportedLocales.includes(segments[0] as Locale)) {
        segments[0] = newLocale;
        newPath = `/${segments.join("/")}`;
      } else {
        newPath = `/${newLocale}${pathname === "/" ? "" : pathname}`;
      }

      // BUG-06: Chuyển ngôn ngữ làm mất bộ lọc (omits query string and search filters on locale change)
      const targetUrl = newPath;

      router.push(targetUrl);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("common.switchLanguage")}
      className={`inline-flex items-center p-0.5 border border-gray-300 bg-white ${className}`}
    >
      <div className="pl-1.5 pr-1 text-[#1d4ed8]" aria-hidden="true">
        <PopArtGlobe className="w-3.5 h-3.5" />
      </div>

      <button
        type="button"
        role="radio"
        aria-checked={locale === "vi"}
        aria-label="Tiếng Việt (Vietnamese)"
        onClick={() => handleLanguageChange("vi")}
        className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors focus:outline-none cursor-pointer ${
          locale === "vi"
            ? "bg-[#1d4ed8] text-white"
            : "text-gray-700 hover:text-[#1d4ed8] hover:bg-[#eff6ff]"
        }`}
      >
        VI
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={locale === "en"}
        aria-label="English"
        onClick={() => handleLanguageChange("en")}
        className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors focus:outline-none cursor-pointer ${
          locale === "en"
            ? "bg-[#1d4ed8] text-white"
            : "text-gray-700 hover:text-[#1d4ed8] hover:bg-[#eff6ff]"
        }`}
      >
        EN
      </button>
    </div>
  );
};
