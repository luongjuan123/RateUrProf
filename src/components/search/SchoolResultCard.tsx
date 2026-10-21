"use client";

import React from "react";
import Link from "next/link";
import { University } from "@/types";
import { useTranslation } from "@/locales/i18n";
import { getRatingLevel } from "@/lib/ratingLevels";

interface SchoolResultCardProps {
  university: University;
}

export const SchoolResultCard: React.FC<SchoolResultCardProps> = ({ university }) => {
  const { locale } = useTranslation();

  const name =
    locale === "en"
      ? university.englishName || university.nameEn || university.name
      : university.nameVi || university.name;

  const city =
    locale === "en"
      ? university.cityEn || university.city
      : university.cityVi || university.city;

  const reviewCount = university.totalReviews ?? 0;
  const hasReviews = reviewCount > 0 && typeof university.ratingAverage === "number" && university.ratingAverage > 0;
  const ratingDisplay = hasReviews ? university.ratingAverage!.toFixed(1) : "N/A";

  // Score Badge Color (User-specified 5-tier rating scale)
  const level = hasReviews && typeof university.ratingAverage === "number"
    ? getRatingLevel(university.ratingAverage)
    : null;
  const leftBorderColor = level ? level.color : "#38bdf8";
  const badgeBg = level ? level.lightBg : "#ede9fe";
  const badgeTextColor = level ? level.textColor : "#6b21a8";

  const universityHref = `/${locale}/universities/${university.id}`;

  return (
    <div
      className="bg-white border-2 border-black border-l-8 transition-all rounded-none p-4 sm:p-5 shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-translate-x-[2px] hover:-translate-y-[2px]"
      style={{ borderLeftColor: leftBorderColor }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Quality Badge & Ratings count */}
        <div className="flex flex-col items-center shrink-0 w-20 sm:w-24">
          <div
            className="w-full py-2 px-1 text-center rounded-none select-none border-2 border-black shadow-[2px_2px_0px_#000]"
            style={{ backgroundColor: badgeBg, color: badgeTextColor }}
          >
            <div className="text-[9px] font-mono font-black tracking-wider uppercase opacity-85">
              {level
                ? locale === "vi"
                  ? level.labelVi
                  : level.labelEn
                : locale === "en"
                ? "QUALITY"
                : "CHẤT LƯỢNG"}
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black tracking-tight leading-none mt-1">
              {ratingDisplay}
            </div>
          </div>
          <div className="text-[11px] font-mono text-gray-700 font-bold mt-1.5 text-center">
            {locale === "en"
              ? `${reviewCount} ${reviewCount === 1 ? "rating" : "ratings"}`
              : `${reviewCount} đánh giá`}
          </div>
        </div>

        {/* Center: University Name & Info */}
        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={universityHref}
              className="text-lg sm:text-xl font-mono font-black text-black hover:underline hover:text-[#e03a3e] transition-colors line-clamp-1 block"
            >
              {name}
            </Link>

            {/* Top Right: Location (e.g. Palo Alto, CA / Hà Nội) */}
            {city && (
              <span className="text-xs font-mono font-bold text-black bg-[#e0f2fe] px-2 py-0.5 border border-black shadow-[1px_1px_0px_#000] shrink-0">
                {city}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-gray-700 flex-wrap">
            {university.shortName && (
              <span className="bg-[#fef9c3] text-black px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_#000]">
                {university.shortName}
              </span>
            )}
            {university.totalProfessors ? (
              <span className="bg-[#dcfce7] text-black px-2 py-0.5 border border-black shadow-[1px_1px_0px_#000]">
                {university.totalProfessors} {locale === "en" ? "professors" : "giảng viên"}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolResultCard;
