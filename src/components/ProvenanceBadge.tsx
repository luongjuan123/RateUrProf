"use client";

import React from "react";
import { FieldProvenance } from "@/types";
import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { useTranslation } from "@/locales/i18n";

interface ProvenanceBadgeProps {
  provenance?: FieldProvenance;
  fieldLabel?: string;
  onClick?: () => void;
  showText?: boolean;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  provenance,
  fieldLabel,
  onClick,
  showText = false,
}) => {
  const { t } = useTranslation();

  if (!provenance) {
    return (
      <span
        title={t("common.unverified")}
        className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-semibold"
      >
        <HelpCircle className="w-3 h-3 text-gray-400" />
        {showText && <span>{t("common.unverified")}</span>}
      </span>
    );
  }

  const isConflict = provenance.verificationStatus === "conflicting" || Boolean(provenance.conflictingEvidence?.length);
  const isVerified = provenance.verificationStatus === "verified";

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        isConflict
          ? t("provenance.conflictAlert")
          : `${t("provenance.verifiedSource")}: ${provenance.sourceName || provenance.sourceUrl}`
      }
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-none border transition-colors ${
        isConflict
          ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
          : isVerified
          ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
          : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
      }`}
    >
      {isConflict ? (
        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
      ) : (
        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
      )}
      {showText && (
        <span className="truncate max-w-[120px]">
          {isConflict ? t("common.conflicting") : t("common.verified")}
        </span>
      )}
    </button>
  );
};
