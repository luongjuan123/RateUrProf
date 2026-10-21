"use client";

import React from "react";
import { FieldProvenance } from "@/types";
import {
  PopArtCheck,
  PopArtAlertTriangle,
  PopArtHelpCircle,
} from "@/components/icons/PopArtIcons";
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
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-bold text-black border-2 border-black bg-white shadow-[1px_1px_0px_#000] rounded-none"
      >
        <PopArtHelpCircle className="w-3 h-3" />
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
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-black rounded-none border-2 border-black shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer ${
        isConflict
          ? "bg-[#fee2e2] text-black hover:bg-[#fca5a5]"
          : isVerified
          ? "bg-[#6ee7b7] text-black hover:bg-[#34d399]"
          : "bg-[#fef9c3] text-black hover:bg-[#fde047]"
      }`}
    >
      {isConflict ? (
        <PopArtAlertTriangle className="w-3 h-3 shrink-0" />
      ) : (
        <PopArtCheck className="w-3 h-3 shrink-0" />
      )}
      {showText && (
        <span className="truncate max-w-[120px]">
          {isConflict ? t("common.conflicting") : t("common.verified")}
        </span>
      )}
    </button>
  );
};
