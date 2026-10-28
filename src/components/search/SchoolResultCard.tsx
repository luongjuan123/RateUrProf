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

  const level = hasReviews && typeof university.ratingAverage === "number"
    ? getRatingLevel(university.ratingAverage)
    : null;

  const universityHref = `/${locale}/universities/${university.id}`;

  return (
    <div
      className="bg-white border border-gray-200 border-l-4 transition-colors p-4 sm:p-5 hover:border-[#1d4ed8]"
      style={{ borderLeftColor: "#1d4ed8" }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Quality Badge & Ratings count */}
        <div className="flex flex-col items-center shrink-0 w-20 sm:w-24">
          <div
            className="w-full py-2 px-1 text-center select-none border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]"
          >
            <div className="text-[9px] font-mono font-bold tracking-wider uppercase opacity-85">
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
          <div className="text-[11px] font-mono text-slate-500 font-medium mt-1.5 text-center">
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
              className="text-lg sm:text-xl font-mono font-bold text-slate-900 hover:underline hover:text-[#1d4ed8] transition-colors line-clamp-1 block"
            >
              {name}
            </Link>

            {/* Top Right: Location */}
            {city && (
              <span className="text-xs font-mono font-medium text-[#1d4ed8] bg-[#eff6ff] px-2 py-0.5 border border-[#bfdbfe] shrink-0">
                {city}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-medium text-slate-600 flex-wrap">
            {university.shortName && (
              <span className="bg-[#eff6ff] text-[#1d4ed8] px-1.5 py-0.5 border border-[#bfdbfe] font-bold">
                {university.shortName}
              </span>
            )}
            {university.totalProfessors ? (
              <span className="bg-slate-50 text-slate-700 px-2 py-0.5 border border-slate-200">
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
