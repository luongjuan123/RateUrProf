"use client";

import React, { createContext, useContext, useState, useEffect, useTransition } from "react";
import viDict from "./vi.json";
import enDict from "./en.json";

import { Locale, defaultLocale, supportedLocales } from "./config";
export * from "./config";

const dictionaries: Record<Locale, typeof viDict> = {
  vi: viDict,
  en: enDict as typeof viDict,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (newLocale: Locale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  isPending: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getNestedValue(obj: Record<string, unknown> | undefined, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  // 1. Try selected locale
  let text = getNestedValue(dictionaries[locale], key);

  // 2. Fall back to Vietnamese if missing in English
  if (!text && locale !== "vi") {
    text = getNestedValue(dictionaries.vi, key);
  }

  // 3. Fallback to raw key if completely missing
  if (!text) {
    return key;
  }

  // Interpolate {{param}}
  if (params) {
    return Object.entries(params).reduce((acc, [k, v]) => {
      return acc.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
    }, text);
  }

  return text;
}

export const I18nProvider: React.FC<{
  initialLocale?: Locale;
  children: React.ReactNode;
}> = ({ initialLocale = defaultLocale, children }) => {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Sync with html lang attribute
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    if (!supportedLocales.includes(newLocale)) return;
    startTransition(() => {
      setLocaleState(newLocale);
      try {
        // Persist preference in cookie (1 year) & localStorage
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        localStorage.setItem("rateprof_locale", newLocale);
      } catch {
        // Safe in restricted storage environments
      }
    });
  };

  const t = (path: string, params?: Record<string, string | number>) => {
    return translate(locale, path, params);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isPending }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Provide safe fallback if accessed outside I18nProvider (e.g. unit tests)
    return {
      locale: defaultLocale,
      setLocale: () => {},
      t: (path: string, params?: Record<string, string | number>) => translate(defaultLocale, path, params),
      isPending: false,
    };
  }
  return ctx;
}
