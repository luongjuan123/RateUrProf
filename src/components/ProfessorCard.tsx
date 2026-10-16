"use client";

import React from "react";
import Link from "next/link";
import { Professor } from "@/types";
import { useTranslation } from "@/locales/i18n";
import { LecturerAvatar } from "@/components/LecturerAvatar";
import { formatOptionalText } from "@/lib/formatters";
import { Star, ArrowRight } from "lucide-react";

interface ProfessorCardProps {
  professor: Professor;
  variant?: "standard" | "compact" | "medium" | "small" | "spotlight";
}

export const ProfessorCard: React.FC<ProfessorCardProps> = ({
  professor,
  variant = "standard",
}) => {
  const { locale } = useTranslation();

  const faculty = locale === "en" ? (professor.facultyEn || professor.faculty) : (professor.facultyVi || professor.faculty);
  const uniName = locale === "en" ? (professor.universityNameEn || professor.universityName) : (professor.universityNameVi || professor.universityName);
  const department = locale === "en" ? (professor.departmentEn || professor.department) : (professor.departmentVi || professor.department);

  const hasReviews = (professor.ratingCount || 0) > 0;
  const ratingDisplay = (hasReviews && typeof professor.ratingAverage === "number") ? professor.ratingAverage.toFixed(1) : null;
  const subtitle = formatOptionalText(faculty || department || professor.title, locale);

  const profileHref = `/${locale}/professors/${professor.id}`;

  if (variant === "compact") {
    return (
      <Link
        href={profileHref}
        className="group flex items-center justify-between p-3.5 bg-white border border-gray-300 hover:border-black transition-colors rounded-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <LecturerAvatar
            name={professor.name}
            photoUrl={professor.photoUrl || professor.avatar}
            photoStatus={professor.photoStatus}
            className="w-10 h-10 shrink-0 rounded-none border border-gray-300"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#e03a3e]">
                {professor.universityShortName}
              </span>
              <span className="text-xs font-bold text-gray-900 truncate group-hover:text-[#e03a3e] transition-colors">
                {professor.name}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>
          </div>
        </div>

        <div className="shrink-0 text-right pl-3">
          {hasReviews && ratingDisplay ? (
            <div className="inline-flex items-center gap-1 text-xs font-bold text-gray-900">
              <Star className="w-3.5 h-3.5 fill-[#e03a3e] text-[#e03a3e]" />
              <span>{ratingDisplay}/5</span>
            </div>
          ) : (
            <span className="text-[11px] text-gray-500 font-medium">
              {locale === "en" ? "Not rated yet" : "Chưa có đánh giá"}
            </span>
          )}
        </div>
      </Link>
    );
  }

  // Standard Minimalist Card (used on Homepage and Directory)
  return (
    <div className="group flex flex-col justify-between bg-white border border-gray-300 p-5 hover:border-black transition-colors rounded-none">
      <div>
        {/* Top: Photo & University info */}
        <div className="flex items-start gap-3.5">
          <LecturerAvatar
            name={professor.name}
            photoUrl={professor.photoUrl || professor.avatar}
            photoStatus={professor.photoStatus}
            className="w-14 h-14 shrink-0 rounded-none border border-gray-300"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-gray-100 text-[#e03a3e] border border-gray-300">
                {professor.universityShortName}
              </span>
              <span className="text-[11px] text-gray-500 truncate" title={uniName}>
                {uniName}
              </span>
            </div>

            <Link href={profileHref} className="block mt-1">
              <h3 className="text-base font-bold text-gray-950 group-hover:text-[#e03a3e] transition-colors line-clamp-1">
                {professor.name}
              </h3>
            </Link>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Muted divider */}
        <div className="my-4 border-t border-gray-200" />
      </div>

      {/* Bottom: Rating & Profile Action */}
      <div className="flex items-center justify-between text-xs">
        <div>
          {hasReviews && ratingDisplay ? (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-900 border border-gray-300 font-black text-xs">
                <Star className="w-3.5 h-3.5 fill-[#e03a3e] text-[#e03a3e]" />
                <span>{ratingDisplay}</span>
                <span className="text-[10px] font-normal text-gray-500">/ 5.0</span>
              </div>
              <span className="text-gray-500 text-[11px]">
                {professor.ratingCount} {locale === "en" ? (professor.ratingCount === 1 ? "review" : "reviews") : "đánh giá"}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-gray-500 font-medium">
              {locale === "en" ? "Not rated yet" : "Chưa có đánh giá"}
            </span>
          )}
        </div>

        <Link
          href={profileHref}
          className="inline-flex items-center gap-1 text-xs font-bold text-gray-900 hover:text-[#e03a3e] transition-colors"
        >
          <span>{locale === "en" ? "View profile" : "Xem hồ sơ"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
