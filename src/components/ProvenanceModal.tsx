"use client";

import React from "react";
import { FieldProvenance } from "@/types";
import { useTranslation } from "@/locales/i18n";
import {
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  X,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  Flag
} from "lucide-react";

interface ProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  provenances?: Record<string, FieldProvenance>;
  activeField?: string;
  professorName: string;
  onRequestCorrection?: (field?: string) => void;
}

export const ProvenanceModal: React.FC<ProvenanceModalProps> = ({
  isOpen,
  onClose,
  provenances = {},
  activeField,
  professorName,
  onRequestCorrection,
}) => {
  const { t, locale } = useTranslation();

  if (!isOpen) return null;

  const entries = Object.entries(provenances);
  const selectedProvenance = activeField ? provenances[activeField] : entries[0]?.[1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-gray-900 rounded-none w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-gray-950">
                {t("provenance.title")}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Hồ sơ: <span className="text-gray-900 font-bold">{professorName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-black hover:bg-gray-200 rounded-none transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-700">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-none text-emerald-900 font-medium flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p>
              {t("provenance.officialEvidenceOnly")}
            </p>
          </div>

          {entries.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50 border border-gray-200">
              <p>{t("common.noInformation")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map(([key, prov]) => {
                const isConflict = prov.verificationStatus === "conflicting" || Boolean(prov.conflictingEvidence?.length);

                return (
                  <div
                    key={key}
                    className={`p-4 border rounded-none space-y-3 transition-colors ${
                      isConflict
                        ? "bg-amber-50/50 border-amber-300"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 uppercase text-[11px] tracking-wider">
                          Trường dữ liệu: <span className="text-[#e03a3e]">{prov.field}</span>
                        </span>
                        {isConflict ? (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-none border border-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            {t("provenance.conflictAlert")}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[10px] rounded-none border border-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-700" />
                            {t("provenance.verifiedSource")}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-gray-500 font-mono">
                        {prov.extractionMethod}
                      </span>
                    </div>

                    {/* Source URL & Name */}
                    <div className="space-y-1">
                      <div className="font-bold text-gray-900 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-gray-500" />
                        <span>Nguồn: {prov.sourceName || "Cổng thông tin đại học chính thức"}</span>
                      </div>
                      <a
                        href={prov.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#e03a3e] hover:underline font-medium break-all"
                      >
                        <span>{prov.sourceUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>

                    {/* Supporting Text Excerpt */}
                    {prov.extractedTextExcerpt && (
                      <div className="p-3 bg-gray-50 border-l-2 border-[#e03a3e] font-sans text-gray-800 italic leading-relaxed">
                        “{prov.extractedTextExcerpt}”
                      </div>
                    )}

                    {/* Conflicting Evidence if any */}
                    {prov.conflictingEvidence && prov.conflictingEvidence.length > 0 && (
                      <div className="p-3 bg-amber-100/60 border border-amber-300 rounded-none space-y-2">
                        <div className="font-bold text-amber-950 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          <span>Dữ liệu xung đột từ nguồn khác:</span>
                        </div>
                        {prov.conflictingEvidence.map((conf, ci) => (
                          <div key={ci} className="text-[11px] space-y-1 text-amber-900 border-t border-amber-200 pt-1">
                            <p className="font-semibold">Giá trị khác: &quot;{conf.value}&quot;</p>
                            <a
                              href={conf.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#e03a3e] hover:underline"
                            >
                              <span>{conf.sourceName || conf.sourceUrl}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            {conf.excerpt && <p className="italic text-gray-600">“{conf.excerpt}”</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="pt-2 flex flex-wrap items-center justify-between text-[10px] text-gray-500 border-t border-gray-100">
                      <span>Thu thập: {new Date(prov.retrievedAt).toLocaleString(locale === "en" ? "en-US" : "vi-VN")}</span>
                      {prov.lastVerifiedAt && (
                        <span>Kiểm chứng lần cuối: {new Date(prov.lastVerifiedAt).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onRequestCorrection) onRequestCorrection(activeField);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 hover:text-red-900 hover:bg-red-50 rounded-none transition-colors border border-red-200"
          >
            <Flag className="w-3.5 h-3.5 text-red-600" />
            <span>{t("provenance.reportData")}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-black text-white text-xs font-bold uppercase rounded-none hover:bg-gray-800"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
};
