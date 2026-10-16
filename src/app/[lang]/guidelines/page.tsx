"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@/locales/i18n";
import {
  ShieldCheck,
  AlertTriangle,
  Lock,
  Scale,
  Mail,
  CheckCircle2
} from "lucide-react";

export default function LocalizedGuidelinesPage() {
  const { locale, t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Editorial Header */}
      <div className="border-b-2 border-gray-900 pb-4">
        <span className="text-[11px] font-black uppercase tracking-widest text-[#e03a3e]">
          {t("nav.civilityStandards")}
        </span>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-gray-950 mt-1">
          {t("guidelines.title")}
        </h1>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          {t("guidelines.subtitle")}
        </p>
      </div>

      {/* Core Principles */}
      <div className="space-y-6">
        <div className="p-6 bg-white border border-gray-200 space-y-3">
          <div className="flex items-center gap-2 text-gray-900 font-extrabold text-base">
            <Scale className="w-5 h-5 text-[#e03a3e]" />
            <h3>{t("guidelines.principle1Title")}</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {t("guidelines.principle1Desc")}
          </p>
        </div>

        <div className="p-6 bg-white border border-gray-200 space-y-3">
          <div className="flex items-center gap-2 text-gray-900 font-extrabold text-base">
            <AlertTriangle className="w-5 h-5 text-[#e03a3e]" />
            <h3>{t("guidelines.principle2Title")}</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {t("guidelines.principle2Desc")}
          </p>
        </div>

        <div id="anti-harassment" className="p-6 bg-white border border-gray-200 space-y-3 scroll-mt-24">
          <div className="flex items-center gap-2 text-gray-900 font-extrabold text-base">
            <Lock className="w-5 h-5 text-[#e03a3e]" />
            <h3>{t("guidelines.principle3Title")}</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {t("guidelines.principle3Desc")}
          </p>
        </div>

        <div className="p-6 bg-white border border-gray-200 space-y-3">
          <div className="flex items-center gap-2 text-gray-900 font-extrabold text-base">
            <CheckCircle2 className="w-5 h-5 text-[#e03a3e]" />
            <h3>{t("guidelines.principle4Title")}</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {t("guidelines.principle4Desc")}
          </p>
        </div>
      </div>

      {/* Moderation Workflow */}
      <div className="p-6 bg-gray-50 border border-gray-200 space-y-3">
        <h3 className="text-base font-extrabold text-gray-900">
          {t("guidelines.moderationProcessTitle")}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
          {t("guidelines.moderationProcessDesc")}
        </p>
      </div>

      {/* Contact Channel */}
      <div id="contact" className="p-6 bg-black text-white space-y-3 scroll-mt-24">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-[#e03a3e]" />
          <h3 className="text-base font-bold uppercase tracking-wider">
            {t("guidelines.contactTitle")}
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-gray-300">
          Email: <span className="text-[#e03a3e] font-bold">{t("guidelines.contactEmail")}</span>
        </p>
      </div>
    </div>
  );
}
