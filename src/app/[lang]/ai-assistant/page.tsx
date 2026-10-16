"use client";

import React, { useState } from "react";
import Link from "next/link";
import { queryBilingualRag, RagResponse } from "@/lib/ragAssistant";
import { useTranslation } from "@/locales/i18n";
import {
  Sparkles,
  Search,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  Globe,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function LocalizedAiAssistantPage() {
  const { locale, t } = useTranslation();

  const [query, setQuery] = useState("");
  const [responseLang, setResponseLang] = useState<"auto" | "vi" | "en">("auto");
  const [result, setResult] = useState<RagResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const sampleQuestions = locale === "vi" ? [
    t("aiAssistant.sample1"),
    t("aiAssistant.sample2"),
    t("aiAssistant.sample3"),
    t("aiAssistant.sample4")
  ] : [
    t("aiAssistant.sample1"),
    t("aiAssistant.sample2"),
    t("aiAssistant.sample3"),
    t("aiAssistant.sample4")
  ];

  const handleAsk = async (promptQuery?: string) => {
    const q = promptQuery || query;
    if (!q.trim()) return;

    try {
      setLoading(true);
      const pref = responseLang === "auto" ? undefined : responseLang;
      const res = await queryBilingualRag(q.trim(), pref);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-[#e03a3e] border border-red-200 mb-2">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider">
            {t("aiAssistant.title")}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-gray-950">
          {t("aiAssistant.title")}
        </h1>
        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
          {t("aiAssistant.subtitle")}
        </p>
      </div>

      {/* Query Card */}
      <div className="bg-white border-2 border-gray-900 p-6 space-y-4">
        {/* Preferred Language Selection */}
        <div className="flex flex-wrap items-center justify-between text-xs gap-2">
          <span className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
            Ngôn ngữ phản hồi mong muốn / Desired Response Language:
          </span>
          <div className="inline-flex border border-gray-300 p-0.5 bg-gray-50 text-[11px] font-bold">
            <button
              onClick={() => setResponseLang("auto")}
              className={`px-2.5 py-1 ${
                responseLang === "auto" ? "bg-black text-white" : "text-gray-600 hover:text-black"
              }`}
            >
              Tự động / Auto
            </button>
            <button
              onClick={() => setResponseLang("vi")}
              className={`px-2.5 py-1 ${
                responseLang === "vi" ? "bg-[#e03a3e] text-white" : "text-gray-600 hover:text-black"
              }`}
            >
              Tiếng Việt
            </button>
            <button
              onClick={() => setResponseLang("en")}
              className={`px-2.5 py-1 ${
                responseLang === "en" ? "bg-[#e03a3e] text-white" : "text-gray-600 hover:text-black"
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Input Textarea & Submit */}
        <div className="space-y-3">
          <textarea
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("aiAssistant.inputPlaceholder")}
            className="w-full p-3 text-sm border border-gray-300 focus:outline-none focus:border-black font-medium text-gray-900 leading-relaxed"
          />

          <div className="flex items-center justify-between">
            <button
              onClick={() => { setQuery(""); setResult(null); }}
              className="text-xs text-gray-500 hover:text-black font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa câu hỏi</span>
            </button>

            <button
              onClick={() => handleAsk()}
              disabled={loading || !query.trim()}
              className="px-6 py-2.5 bg-[#e03a3e] hover:bg-[#b91c1c] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? t("aiAssistant.thinking") : t("aiAssistant.askButton")}</span>
            </button>
          </div>
        </div>

        {/* Sample Questions */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
            {t("aiAssistant.sampleQuestionsTitle")}
          </span>
          <div className="flex flex-wrap gap-2">
            {sampleQuestions.map((q) => (
              <button
                key={q}
                onClick={() => { setQuery(q); handleAsk(q); }}
                className="text-left text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 text-gray-800 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RAG Answer Display */}
      {loading && (
        <div className="p-10 bg-gray-50 border border-gray-200 text-center space-y-3 animate-pulse">
          <div className="w-8 h-8 border-3 border-[#e03a3e] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-bold text-gray-600">{t("aiAssistant.thinking")}</p>
        </div>
      )}

      {result && !loading && (
        <div className="p-6 bg-white border border-gray-200 space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-gray-100 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 shrink-0" />
              <span className="text-xs font-black uppercase text-gray-900 tracking-wider">
                Kết quả tổng hợp đối chiếu / Synthesized RAG Output
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
              <span className="px-2 py-0.5 bg-gray-100 border border-gray-200">
                Ngôn ngữ câu hỏi: {result.detectedQueryLanguage.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 bg-black text-white">
                Ngôn ngữ trả lời: {result.responseLanguage.toUpperCase()}
              </span>
            </div>
          </div>

          {result.machineTranslatedNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{result.machineTranslatedNotice}</span>
            </div>
          )}

          {/* Answer Text */}
          <div className="text-sm text-gray-800 leading-relaxed font-sans whitespace-pre-line space-y-3">
            {result.answer}
          </div>

          {/* Citations List */}
          {result.citations.length > 0 && (
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t("aiAssistant.sourcesCited", { count: result.citations.length })}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.citations.map((c, i) => (
                  <div
                    key={i}
                    className="p-3 bg-gray-50 border border-gray-200 text-xs space-y-1.5 hover:border-gray-400 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-gray-900 truncate">
                        {c.title}
                      </span>
                      <span className="px-1.5 py-0.2 bg-gray-200 text-gray-700 text-[9px] font-bold uppercase border border-gray-300 shrink-0">
                        {c.originalLanguage.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-2">
                      {c.snippet}
                    </p>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#e03a3e] hover:underline"
                    >
                      <span>Xem nguồn kiểm chứng</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-gray-50 border border-gray-200 text-[11px] text-gray-500">
            {t("aiAssistant.disclaimer")}
          </div>
        </div>
      )}
    </div>
  );
}
