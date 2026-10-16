"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  X,
  BookOpen,
  MapPin,
  Award,
  Globe,
  Loader2,
} from "lucide-react";
import { RagResponse, queryBilingualRag } from "@/lib/ragAssistant";

interface RagSearchAssistantProps {
  initialQuery?: string;
  className?: string;
}

const TEST_SCENARIOS = [
  {
    id: "ai-research",
    label: "Giáo sư Trí tuệ nhân tạo (AI)",
    query: "Giáo sư nghiên cứu Trí tuệ nhân tạo (AI)",
    icon: Sparkles,
  },
  {
    id: "hcm-faculty",
    label: "Giảng viên tại TP.HCM",
    query: "Giảng viên CNTT tại TP. Hồ Chí Minh",
    icon: MapPin,
  },
  {
    id: "en-economics",
    label: "Economics in Hanoi (English)",
    query: "Economics and finance professors in Hanoi",
    icon: Globe,
  },
  {
    id: "pgs-software",
    label: "Phó Giáo sư (PGS) Phần mềm",
    query: "Tìm kiếm Phó Giáo sư (PGS) ngành Công nghệ Phần mềm",
    icon: Award,
  },
  {
    id: "disambiguation",
    label: "Phân biệt trùng tên",
    query: "Phân biệt giảng viên trùng tên giữa các trường đại học",
    icon: HelpCircle,
  },
  {
    id: "no-hallucination",
    label: "Thử nghiệm: Dữ liệu chưa có",
    query: "Tìm kiếm giáo sư chuyên ngành Kỹ thuật Hạt nhân tại Huế",
    icon: AlertCircle,
  },
];

export function RagSearchAssistant({
  initialQuery = "",
  className = "",
}: RagSearchAssistantProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RagResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preferredLang, setPreferredLang] = useState<"vi" | "en">("vi");

  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setError(null);
    setQuery(queryText);

    try {
      const data = await queryBilingualRag(queryText, preferredLang);
      setResponse(data);
    } catch (err) {
      console.error("RAG search failed:", err);
      setError("Không thể kết nối đến trợ lý tra cứu học thuật. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResponse(null);
    setError(null);
  };

  // Simple markdown renderer for answers
  const renderFormattedAnswer = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="text-base font-bold text-slate-900 dark:text-slate-100 mt-4 mb-1">
            {renderInlineMarkdown(line.slice(4))}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">
            {renderInlineMarkdown(line.slice(3))}
          </h3>
        );
      }
      // Blockquotes
      if (line.startsWith("> ")) {
        return (
          <blockquote
            key={idx}
            className="border-l-4 border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-900 dark:text-amber-200 my-2"
          >
            {renderInlineMarkdown(line.slice(2))}
          </blockquote>
        );
      }
      // List items
      if (line.startsWith("- ")) {
        return (
          <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 ml-4 list-disc my-1">
            {renderInlineMarkdown(line.slice(2))}
          </li>
        );
      }
      // Empty lines
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      // Regular paragraphs
      return (
        <p key={idx} className="text-sm text-slate-800 dark:text-slate-200 my-1 leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Helper for inline markdown like bold, code, and links
  const renderInlineMarkdown = (content: string) => {
    // Replace markdown links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: (string | React.ReactNode)[] = [];
    let lastIdx = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIdx) {
        parts.push(content.substring(lastIdx, match.index));
      }
      const linkText = match[1];
      const linkUrl = match[2];
      const isExternal = linkUrl.startsWith("http");

      parts.push(
        isExternal ? (
          <a
            key={match.index}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-0.5"
          >
            {linkText}
            <ExternalLink className="w-3 h-3 inline ml-0.5" />
          </a>
        ) : (
          <Link
            key={match.index}
            href={linkUrl}
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            {linkText}
          </Link>
        )
      );
      lastIdx = linkRegex.lastIndex;
    }
    if (lastIdx < content.length) {
      parts.push(content.substring(lastIdx));
    }

    return (
      <>
        {parts.map((p, i) => {
          if (typeof p !== "string") return <React.Fragment key={i}>{p}</React.Fragment>;
          // Simple bold formatting
          const boldParts = p.split(/(\*\*[^*]+\*\*)/g);
          return (
            <React.Fragment key={i}>
              {boldParts.map((bp, bi) => {
                if (bp.startsWith("**") && bp.endsWith("**")) {
                  return <strong key={bi} className="font-semibold text-slate-900 dark:text-slate-100">{bp.slice(2, -2)}</strong>;
                }
                // Code formatting
                const codeParts = bp.split(/(`[^`]+`)/g);
                return codeParts.map((cp, ci) => {
                  if (cp.startsWith("`") && cp.endsWith("`")) {
                    return (
                      <code key={ci} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200">
                        {cp.slice(1, -1)}
                      </code>
                    );
                  }
                  return cp;
                });
              })}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                Trợ lý Tra cứu Học thuật & RAG Toàn quốc
                <span className="text-[10px] bg-blue-500/30 text-blue-200 uppercase tracking-wider px-2 py-0.5 font-semibold border border-blue-400/30">
                  Kiểm chứng 100%
                </span>
              </h3>
              <p className="text-xs text-blue-200/80">
                Truy vấn dữ liệu giảng viên, ngành học, cơ sở đại học có trích dẫn nguồn gốc chính thức (.edu.vn)
              </p>
            </div>
          </div>

          {/* Language Toggle */}
          <div className="flex items-center gap-1 bg-white/10 p-1 border border-white/10 text-xs">
            <button
              onClick={() => setPreferredLang("vi")}
              className={`px-2 py-1 font-medium transition ${
                preferredLang === "vi"
                  ? "bg-white text-slate-900"
                  : "text-blue-200 hover:text-white"
              }`}
            >
              Tiếng Việt
            </button>
            <button
              onClick={() => setPreferredLang("en")}
              className={`px-2 py-1 font-medium transition ${
                preferredLang === "en"
                  ? "bg-white text-slate-900"
                  : "text-blue-200 hover:text-white"
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-4 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
            placeholder={
              preferredLang === "vi"
                ? "Nhập câu hỏi học thuật (VD: 'Giáo sư nghiên cứu Trí tuệ nhân tạo', 'Giảng viên CNTT tại TPHCM')..."
                : "Ask academic questions (e.g., 'AI professors in Hanoi', 'Economics lecturers')..."
            }
            className="w-full bg-white/10 border border-white/20 focus:border-blue-400 pl-11 pr-24 py-3 text-sm text-white placeholder-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          />
          <Search className="w-5 h-5 text-blue-300 absolute left-3.5 top-3.5" />
          <div className="absolute right-2 top-2 flex items-center gap-1">
            {query && (
              <button
                onClick={clearSearch}
                className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleSearch(query)}
              disabled={loading || !query.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs px-3.5 py-1.5 transition flex items-center gap-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Tra cứu...
                </>
              ) : (
                "Tìm kiếm"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 6 One-Click Test Scenarios */}
      <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            Kịch bản tra cứu mẫu (1-Click Test Scenarios):
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TEST_SCENARIOS.map((scenario) => {
            const Icon = scenario.icon;
            return (
              <button
                key={scenario.id}
                onClick={() => handleSearch(scenario.query)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition group"
              >
                <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition" />
                {scenario.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body: Result or Welcome */}
      <div className="p-6">
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Đang tra cứu cơ sở dữ liệu học thuật toàn quốc...
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Đối soát nguồn trích dẫn từ các cổng thông tin đại học chính thức (.edu.vn)
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Lỗi tra cứu</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {!loading && response && (
          <div className="space-y-6">
            {/* Verification & Quality Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {response.hasSufficientEvidence ? "Bằng chứng chính thức có xác thực" : "Chưa có dữ liệu kiểm chứng"}
                </span>
                {response.detectedQueryLanguage && (
                  <span className="text-slate-500 dark:text-slate-400">
                    Ngôn ngữ: {response.detectedQueryLanguage === "vi" ? "Tiếng Việt" : "English"}
                  </span>
                )}
              </div>

              {response.machineTranslatedNotice && (
                <span className="text-slate-500 italic">
                  {response.machineTranslatedNotice}
                </span>
              )}
            </div>

            {/* Answer Content */}
            <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm">
              {renderFormattedAnswer(response.answer)}
            </div>

            {/* Citations Box */}
            {response.citations && response.citations.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Nguồn dẫn chứng xác minh trực tiếp ({response.citations.length} nguồn):
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {response.citations.map((cite, idx) => (
                    <a
                      key={idx}
                      href={cite.url}
                      target={cite.url.startsWith("http") ? "_blank" : undefined}
                      rel={cite.url.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700 transition block text-left group"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        <span className="truncate">{cite.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-500 ml-1 shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {cite.snippet}
                      </p>
                      <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 font-mono mt-1 truncate">
                        {cite.url}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !response && (
          <div className="py-6 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm">
              Chọn một trong các kịch bản mẫu ở trên hoặc gõ câu hỏi để tra cứu hồ sơ giảng viên và trường đại học.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RagSearchAssistant;
