"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Professor } from "@/types";
import { useTranslation } from "@/locales/i18n";
import { isBookmarked, toggleBookmark, BOOKMARKS_CHANGED_EVENT } from "@/lib/bookmarks";
import { useAuth } from "@/context/AuthContext";
import { getRatingLevel } from "@/lib/ratingLevels";
import { PopArtBookmark } from "@/components/icons/PopArtIcons";

interface ProfessorResultCardProps {
  professor: Professor;
}

export const ProfessorResultCard: React.FC<ProfessorResultCardProps> = ({ professor }) => {
  const { locale, t } = useTranslation();
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
  const department =
    locale === "en"
      ? professor.departmentEn || professor.department || professor.facultyEn || professor.faculty
      : professor.departmentVi || professor.department || professor.facultyVi || professor.faculty;

  const avg = professor.ratingAverage ?? professor.averageRating ?? null;
  const reviewCount = professor.ratingCount ?? professor.publishedReviewCount ?? 0;
  const hasReviews = reviewCount > 0 && typeof avg === "number";

  // Quality score display ("N/A" when unrated, matching ScoreSquare and Rate My Professors)
  const ratingDisplay = hasReviews && typeof avg === "number" ? avg.toFixed(1) : "N/A";

  // Score Badge Color (User-specified 5-tier rating scale)
  const level = hasReviews && typeof avg === "number" ? getRatingLevel(avg) : null;
  const leftBorderColor = level ? level.color : "#c084fc";
  const badgeBg = level ? level.lightBg : "#ede9fe";
  const badgeTextColor = level ? level.textColor : "#6b21a8";

  const profileHref = `/${locale}/professors/${professor.id}`;

  const takeAgainDisplay =
    hasReviews && professor.takeAgainPercent !== null && professor.takeAgainPercent !== undefined
      ? `${Math.round(professor.takeAgainPercent)}%`
      : "N/A";

  const difficultyDisplay =
    hasReviews && professor.difficultyScore !== null && professor.difficultyScore !== undefined
      ? `${Number(professor.difficultyScore).toFixed(1)}`
      : "N/A";

  return (
    <div
      className="bg-white border border-gray-200 border-l-4 transition-colors p-4 sm:p-5 hover:border-gray-400"
      style={{ borderLeftColor: leftBorderColor }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Quality Badge & Ratings count */}
        <div className="flex flex-col items-center shrink-0 w-20 sm:w-24">
          <div
            className="w-full py-2 px-1 text-center select-none border border-black"
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

        {/* Center: Info */}
        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
          <Link
            href={profileHref}
            className="text-lg sm:text-xl font-mono font-black text-black hover:underline hover:text-[#e03a3e] transition-colors line-clamp-1 block"
          >
            {name}
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            {department && (
              <span className="text-xs font-mono font-bold text-black bg-[#e0f2fe] px-2 py-0.5 border border-sky-300 truncate max-w-xs">
                {department}
              </span>
            )}
            <span className="text-xs font-mono text-gray-700 font-bold truncate">
              {universityName}
            </span>
          </div>

          <div className="text-xs font-mono text-black font-bold pt-1 flex items-center gap-2 flex-wrap">
            <span className="bg-[#dcfce7] px-2 py-0.5 border border-green-300 text-green-900">
              {takeAgainDisplay} {locale === "en" ? "would take again" : "muốn học lại"}
            </span>
            <span className="bg-[#ffedd5] px-2 py-0.5 border border-orange-300 text-orange-950">
              {difficultyDisplay} {locale === "en" ? "difficulty" : "độ khó"}
            </span>
          </div>
        </div>

        {/* Right: Bookmark Button */}
        <div className="shrink-0 pt-0.5">
          <button
            type="button"
            onClick={handleToggleBookmark}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark professor"}
            title={bookmarked ? "Đã lưu" : "Lưu giảng viên"}
            className="p-1.5 bg-white hover:bg-gray-100 border border-gray-300 hover:border-black transition-colors cursor-pointer"
          >
            <PopArtBookmark className="w-4 h-4" filled={bookmarked} color="#facc15" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessorResultCard;
