"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Professor } from "@/types";
import { useTranslation } from "@/locales/i18n";
import { getRatingLevel } from "@/lib/ratingLevels";
import { isBookmarked, toggleBookmark, BOOKMARKS_CHANGED_EVENT } from "@/lib/bookmarks";
import { useAuth } from "@/context/AuthContext";
import { PopArtBookmark, PopArtArrowRight } from "@/components/icons/PopArtIcons";

interface ProfessorRowProps {
  professor: Professor;
}

/**
 * Compact Professor Search Result Row
 * Strictly adheres to Rate My Professors layout and Section 7 requirements:
 * - Square, sharp corners throughout (rounded-none, --radius: 0px).
 * - Real photo or neutral initials avatar.
 * - Full name, canonical university, faculty/department (omitted or neutral if unknown).
 * - Actual average rating and review count from stored reviews (or "Chưa có đánh giá", never 0.0).
 * - Clean, compact vertical list row with subtle border separator.
 */
export const ProfessorRow: React.FC<ProfessorRowProps> = ({ professor }) => {
  const { locale } = useTranslation();
  const { user, openAuthModal } = useAuth();

  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setBookmarked(isBookmarked(professor.id, user?.uid));

    const handleBookmarkChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ professorId: string; isBookmarked: boolean }>;
      if (customEvent.detail && customEvent.detail.professorId === professor.id) {
        setBookmarked(customEvent.detail.isBookmarked);
      } else if (!customEvent.detail?.professorId) {
        setBookmarked(isBookmarked(professor.id, user?.uid));
      }
    };

    window.addEventListener(BOOKMARKS_CHANGED_EVENT, handleBookmarkChange);
    return () => {
      window.removeEventListener(BOOKMARKS_CHANGED_EVENT, handleBookmarkChange);
    };
  }, [professor.id, user?.uid]);

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openAuthModal();
      return;
    }
    const nextState = toggleBookmark(professor.id, user.uid);
    setBookmarked(nextState);
  };

  const name = professor.fullName || professor.name || "";
  const universityName =
    locale === "en"
      ? professor.universityNameEn || professor.universityName
      : professor.universityNameVi || professor.universityName;
  const universityShort = professor.universityShortName || "";
  const department =
    locale === "en"
      ? professor.departmentEn || professor.department || professor.facultyEn || professor.faculty
      : professor.departmentVi || professor.department || professor.facultyVi || professor.faculty;

  const hasReviews = (professor.ratingCount || 0) > 0;
  const avg = professor.ratingAverage ?? professor.averageRating ?? null;
  const ratingDisplay = hasReviews && typeof avg === "number" ? avg.toFixed(1) : null;
  const reviewCount = professor.ratingCount ?? professor.publishedReviewCount ?? 0;

  const profileHref = `/${locale}/professors/${professor.id}`;

  // Quality score box color (User-specified 5-tier rating palette)
  const level = hasReviews && avg !== null ? getRatingLevel(avg) : null;
  const scoreBg = level ? level.lightBg : "#f4f4f5";
  const scoreTextColor = level ? level.textColor : "#52525b";

  return (
    <div className="group border border-gray-200 bg-white hover:border-gray-400 transition-colors p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: Score Box & Main Information */}
        <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
          {/* Quality Score Box in a Square */}
          <div
            className="w-20 sm:w-24 shrink-0 p-2 text-center select-none border border-black"
            style={{ backgroundColor: scoreBg, color: scoreTextColor }}
          >
            <div className="text-[9px] font-mono font-black uppercase tracking-widest opacity-80">
              {locale === "en" ? "QUALITY" : "ĐIỂM SỐ"}
            </div>
            <div className="text-xl sm:text-2xl font-mono font-black tracking-tight leading-tight mt-0.5">
              {ratingDisplay ? ratingDisplay : "N/A"}
            </div>
            <div className="text-[10px] font-mono font-bold truncate mt-0.5 opacity-90">
              {hasReviews ? (
                locale === "en" ? (
                  `${reviewCount} ${reviewCount === 1 ? "rating" : "ratings"}`
                ) : (
                  `${reviewCount} đánh giá`
                )
              ) : (
                <span className="text-[9px] uppercase font-bold">
                  {locale === "en" ? "No ratings" : "Chưa có"}
                </span>
              )}
            </div>
          </div>

          {/* Main Info */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={profileHref}
                className="text-base sm:text-lg font-black text-black group-hover:text-[#1d4ed8] transition-colors truncate"
              >
                {name}
              </Link>
              {universityShort && (
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] shrink-0">
                  {universityShort}
                </span>
              )}
            </div>

            <div className="text-xs sm:text-sm text-gray-700 font-medium truncate">
              {department && <span>{department} · </span>}
              <span className="text-black font-bold">{universityName}</span>
            </div>

            {/* Supporting verified stats: take again % & difficulty, or courses */}
            <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap pt-0.5">
              {hasReviews && professor.takeAgainPercent !== null && professor.takeAgainPercent !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <strong className="text-[#1d4ed8] font-black bg-[#eff6ff] px-1 border border-[#bfdbfe]">{professor.takeAgainPercent}%</strong>{" "}
                  {locale === "en" ? "would take again" : "muốn học lại"}
                </span>
              )}
              {hasReviews && professor.difficultyScore !== null && professor.difficultyScore !== undefined && (
                <span className="inline-flex items-center gap-1">
                  {locale === "en" ? "Difficulty:" : "Độ khó:"}{" "}
                  <strong className="text-[#1d4ed8] font-black bg-[#eff6ff] px-1 border border-[#bfdbfe]">{professor.difficultyScore}/5</strong>
                </span>
              )}
              {!hasReviews && professor.courses && professor.courses.length > 0 && (
                <span className="truncate">
                  {locale === "en" ? "Courses:" : "Môn giảng dạy:"}{" "}
                  <span className="font-semibold text-black">{professor.courses.slice(0, 2).join(", ")}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: View Profile & Bookmark Affordance */}
        <div className="shrink-0 flex items-center justify-end sm:self-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200">
          <button
            type="button"
            onClick={handleToggleBookmark}
            title={bookmarked ? (locale === "vi" ? "Bỏ lưu giảng viên" : "Remove bookmark") : (locale === "vi" ? "Lưu giảng viên" : "Save professor")}
            aria-label={bookmarked ? "Remove bookmark" : "Save professor"}
            className={`p-2 border border-gray-300 hover:border-black transition-colors cursor-pointer ${
              bookmarked ? "bg-[#eff6ff] text-[#1d4ed8] border-[#1d4ed8]" : "bg-white hover:bg-gray-100 text-black"
            }`}
          >
            <PopArtBookmark className="w-4 h-4" filled={bookmarked} color="#1d4ed8" />
          </button>
          <Link
            href={profileHref}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-black uppercase tracking-wider border border-[#1d4ed8] transition-colors"
          >
            <span>{locale === "en" ? "View Profile" : "Xem hồ sơ"}</span>
            <PopArtArrowRight className="w-3.5 h-3.5 text-white" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProfessorRow;
