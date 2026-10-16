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
    ? "RateProfCuaBan — Nền tảng đánh giá giảng viên đại học Việt Nam"
    : "RateProfCuaBan — Vietnam University Professor Ratings & Reviews";

  const description = isVi
    ? "Đánh giá giảng viên. Chia sẻ trải nghiệm. Chọn môn học thông minh. Nền tảng đánh giá và khám phá giảng viên uy tín tại các trường đại học trên toàn quốc."
    : "Rate your professors. Share classroom experiences. Choose courses smartly. The trusted nationwide platform for university professor evaluations across Vietnam.";

  const keywords = isVi
    ? ["đánh giá giảng viên", "rate my professor vietnam", "bách khoa", "kinh tế quốc dân", "ngoại thương", "đại học quốc gia", "sinh viên việt nam"]
    : ["rate my professor vietnam", "vietnam professors", "HUST", "NEU", "HCMUT", "VNU", "vietnam universities", "student reviews"];

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `https://rateprofcuaban.vn/${lang}`,
      languages: {
        vi: "https://rateprofcuaban.vn/vi",
        en: "https://rateprofcuaban.vn/en",
        "x-default": "https://rateprofcuaban.vn/vi"
      }
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: isVi ? "vi_VN" : "en_US",
      siteName: "RateProfCuaBan",
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
