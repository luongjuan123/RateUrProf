"use client";

import React from "react";
import { FieldProvenance } from "@/types";
import { useTranslation } from "@/locales/i18n";
import {
  PopArtShield,
  PopArtAlertTriangle,
  PopArtExternalLink,
  PopArtX,
  PopArtFileText,
  PopArtFlag,
} from "@/components/icons/PopArtIcons";

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
      <div className="bg-white border border-[#111111] rounded-none w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#111111] bg-white">
          <div className="flex items-center gap-2">
            <PopArtShield className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black">
                {t("provenance.title")}
              </h3>
              <p className="text-xs font-mono text-gray-700 font-medium">
                Hồ sơ: <span className="text-black font-bold">{professorName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-1 border border-[#111111] bg-white text-black hover:bg-gray-100 transition-colors cursor-pointer rounded-none"
          >
            <PopArtX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-black font-mono bg-white">
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-none text-emerald-900 font-mono font-medium flex items-start gap-2">
            <PopArtShield className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              {t("provenance.officialEvidenceOnly")}
            </p>
          </div>

          {entries.length === 0 ? (
            <div className="p-8 text-center text-black font-mono bg-gray-50 border border-gray-300">
              <p>{t("common.noInformation")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map(([key, prov]) => {
                const isConflict = prov.verificationStatus === "conflicting" || Boolean(prov.conflictingEvidence?.length);

                return (
                  <div
                    key={key}
                    className={`p-4 border border-[#111111] rounded-none space-y-3 transition-colors ${
                      isConflict
                        ? "bg-red-50/40"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-black uppercase text-[11px] tracking-wider">
                          Trường dữ liệu: <span className="text-[#e03a3e]">{prov.field}</span>
                        </span>
                        {isConflict ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-900 font-mono font-bold text-[10px] rounded-none border border-red-300 flex items-center gap-1">
                            <PopArtAlertTriangle className="w-3 h-3" />
                            {t("provenance.conflictAlert")}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-mono font-bold text-[10px] rounded-none border border-emerald-300 flex items-center gap-1">
                            <PopArtShield className="w-3 h-3" />
                            {t("provenance.verifiedSource")}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-gray-700 font-mono font-medium bg-gray-100 px-1.5 py-0.5 border border-gray-300">
                        {prov.extractionMethod}
                      </span>
                    </div>

                    {/* Source URL & Name */}
                    <div className="space-y-1">
                      <div className="font-mono font-bold text-black flex items-center gap-1">
                        <PopArtFileText className="w-3.5 h-3.5" />
                        <span>Nguồn: {prov.sourceName || "Cổng thông tin đại học chính thức"}</span>
                      </div>
                      <a
                        href={prov.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#e03a3e] hover:underline font-mono font-medium break-all"
                      >
                        <span>{prov.sourceUrl}</span>
                        <PopArtExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Supporting Text Excerpt */}
                    {prov.extractedTextExcerpt && (
                      <div className="p-3 bg-gray-50 border-l-2 border-[#e03a3e] border-y border-r border-gray-200 font-mono text-xs text-black italic leading-relaxed">
                        “{prov.extractedTextExcerpt}”
                      </div>
                    )}

                    {/* Conflicting Evidence if any */}
                    {prov.conflictingEvidence && prov.conflictingEvidence.length > 0 && (
                      <div className="p-3 bg-white border border-red-300 rounded-none space-y-2">
                        <div className="font-mono font-bold text-red-900 flex items-center gap-1">
                          <PopArtAlertTriangle className="w-3.5 h-3.5" />
                          <span>Dữ liệu xung đột từ nguồn khác:</span>
                        </div>
                        {prov.conflictingEvidence.map((conf, ci) => (
                          <div key={ci} className="text-[11px] space-y-1 text-black border-t border-gray-200 pt-1 font-mono">
                            <p className="font-medium">Giá trị khác: &quot;{conf.value}&quot;</p>
                            <a
                              href={conf.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#e03a3e] hover:underline font-medium"
                            >
                              <span>{conf.sourceName || conf.sourceUrl}</span>
                              <PopArtExternalLink className="w-3 h-3" />
                            </a>
                            {conf.excerpt && <p className="italic text-gray-700">“{conf.excerpt}”</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="pt-2 flex flex-wrap items-center justify-between text-[10px] text-gray-600 font-mono border-t border-gray-200">
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
        <div className="p-4 bg-white border-t border-[#111111] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onRequestCorrection) onRequestCorrection(activeField);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-[#e03a3e] hover:bg-red-50 rounded-none transition-colors border border-gray-300 cursor-pointer"
          >
            <PopArtFlag className="w-3.5 h-3.5" />
            <span>{t("provenance.reportData")}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#111111] text-white hover:bg-black text-xs font-mono font-bold uppercase rounded-none border border-[#111111] transition-colors cursor-pointer"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
};
