import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { I18nProvider } from "@/locales/i18n";
import { Locale, supportedLocales } from "@/locales/config";

export async function generateStaticParams() {
  return [{ lang: "vi" }, { lang: "en" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as Locale;

  const isVi = lang === "vi";

  const title = isVi
    ? "rateurprofs - Đánh giá giảng viên"
    : "rateurprofs - Professor Ratings";

  const keywords = isVi
    ? ["rateurprofs", "RateUrProfs", "đánh giá giảng viên", "rate my professor vietnam", "bách khoa", "kinh tế quốc dân", "ngoại thương", "đại học quốc gia", "sinh viên việt nam"]
    : ["rateurprofs", "RateUrProfs", "rate my professor vietnam", "vietnam professors", "HUST", "NEU", "HCMUT", "VNU", "vietnam universities", "student reviews"];

  return {
    metadataBase: new URL("https://rateurprofs.site"),
    title,
    keywords,
    alternates: {
      canonical: `https://rateurprofs.site/${lang}`,
      languages: {
        vi: "https://rateurprofs.site/vi",
        en: "https://rateurprofs.site/en",
        "x-default": "https://rateurprofs.site/vi"
      }
    },
    openGraph: {
      title,
      type: "website",
      locale: isVi ? "vi_VN" : "en_US",
      siteName: "rateurprofs",
    },
    twitter: {
      card: "summary",
      title,
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
}

export default async function LocalizedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as Locale;

  if (!supportedLocales.includes(lang)) {
    notFound();
  }

  return (
    <I18nProvider initialLocale={lang}>
      {children}
    </I18nProvider>
  );
}
