"use client";

import React from "react";
import { getRatingLevel, RatingLevel } from "@/lib/ratingLevels";
import { useTranslation } from "@/locales/i18n";

export interface ScoreSquareProps {
  score?: number | null;
  ratingCount?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "pastel" | "solid";
  showOutOfFive?: boolean;
  showQualityLabel?: boolean;
}

/**
 * ScoreSquare Component
 * Clean, elegant Super Flat Score Badge in Blue & White.
 */
export const ScoreSquare: React.FC<ScoreSquareProps> = ({
  score,
  ratingCount,
  size = "md",
  className = "",
  variant = "pastel",
  showOutOfFive = false,
  showQualityLabel = false,
}) => {
  const { locale } = useTranslation();

  const hasScore =
    score !== null &&
    score !== undefined &&
    !isNaN(score) &&
    score > 0 &&
    (ratingCount === undefined || ratingCount > 0);

  const level: RatingLevel | null = hasScore ? getRatingLevel(score) : null;
  const scoreDisplay = hasScore && typeof score === "number" ? score.toFixed(1) : "N/A";

  const bg = level
    ? variant === "solid"
      ? level.color
      : level.lightBg
    : "#f8fafc";

  const textColor = level
    ? variant === "solid"
      ? "#ffffff"
      : level.textColor
    : "#94a3b8";

  const borderColor = level
    ? variant === "solid"
      ? level.color
      : "#bfdbfe"
    : "#e2e8f0";

  if (size === "xl") {
    return (
      <div
        className={`w-20 h-20 sm:w-24 sm:h-24 shrink-0 border flex flex-col items-center justify-center p-1 select-none text-center ${className}`}
        style={{ backgroundColor: bg, color: textColor, borderColor }}
        role="img"
        aria-label={`Điểm: ${scoreDisplay}`}
      >
        <span className="text-3xl sm:text-4xl font-mono font-black tracking-tight leading-none">
          {scoreDisplay}
        </span>
        {showOutOfFive && (
          <span className="text-[10px] sm:text-[11px] font-mono font-bold leading-tight mt-0.5 opacity-85">
            / 5.0
          </span>
        )}
        {showQualityLabel && (
          <span className="text-[8px] sm:text-[9px] font-mono font-black uppercase tracking-wider mt-0.5 opacity-90">
            {locale === "en" ? "QUALITY" : "CHẤT LƯỢNG"}
          </span>
        )}
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 border flex flex-col items-center justify-center p-1 select-none text-center ${className}`}
        style={{ backgroundColor: bg, color: textColor, borderColor }}
        role="img"
        aria-label={`Điểm: ${scoreDisplay}`}
      >
        <span className="text-xl sm:text-2xl font-mono font-black tracking-tight leading-none">
          {scoreDisplay}
        </span>
        {showOutOfFive && (
          <span className="text-[9px] font-mono font-bold leading-none mt-0.5 opacity-80">
            / 5
          </span>
        )}
      </div>
    );
  }

  if (size === "sm") {
    return (
      <div
        className={`w-8 h-8 shrink-0 border flex items-center justify-center select-none text-center ${className}`}
        style={{ backgroundColor: bg, color: textColor, borderColor }}
        role="img"
        aria-label={`Điểm: ${scoreDisplay}`}
      >
        <span className="text-xs font-mono font-black leading-none">
          {hasScore ? scoreDisplay : "—"}
        </span>
      </div>
    );
  }

  // Default: size === 'md'
  return (
    <div
      className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 border flex flex-col items-center justify-center p-0.5 select-none text-center ${className}`}
      style={{ backgroundColor: bg, color: textColor, borderColor }}
      role="img"
      aria-label={`Điểm: ${scoreDisplay}`}
    >
      <span className="text-sm sm:text-base font-mono font-black tracking-tight leading-none">
        {hasScore ? scoreDisplay : "—"}
      </span>
      {showOutOfFive && hasScore && (
        <span className="text-[8px] font-mono font-bold leading-none mt-0.5 opacity-80">
          / 5
        </span>
      )}
    </div>
  );
};

export default ScoreSquare;
