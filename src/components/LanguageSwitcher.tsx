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
        // Replace existing locale prefix: e.g. /vi/professors -> /en/professors
        segments[0] = newLocale;
        newPath = `/${segments.join("/")}`;
      } else {
        // Prepend locale prefix: e.g. /professors -> /en/professors
        newPath = `/${newLocale}${pathname === "/" ? "" : pathname}`;
      }

      // Preserve query params (?q=...&city=...)
      const queryStr = searchParams?.toString();
      const targetUrl = queryStr ? `${newPath}?${queryStr}` : newPath;

      router.push(targetUrl);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("common.switchLanguage")}
      className={`inline-flex items-center p-0.5 border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000000] ${className}`}
    >
      <div className="pl-1.5 pr-1 text-black" aria-hidden="true">
        <PopArtGlobe className="w-3.5 h-3.5" />
      </div>

      <button
        type="button"
        role="radio"
        aria-checked={locale === "vi"}
        aria-label="Tiếng Việt (Vietnamese)"
        onClick={() => handleLanguageChange("vi")}
        className={`px-2 py-0.5 text-[11px] font-black uppercase tracking-wider transition-all focus:outline-none ${
          locale === "vi"
            ? "bg-[#e03a3e] text-white border border-black shadow-[1px_1px_0px_#000]"
            : "text-gray-800 hover:text-black hover:bg-[#e0f2fe]"
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
        className={`px-2 py-0.5 text-[11px] font-black uppercase tracking-wider transition-all focus:outline-none ${
          locale === "en"
            ? "bg-[#e03a3e] text-white border border-black shadow-[1px_1px_0px_#000]"
            : "text-gray-800 hover:text-black hover:bg-[#e0f2fe]"
        }`}
      >
        EN
      </button>
    </div>
  );
};
