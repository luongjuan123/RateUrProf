"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Professor } from "@/types";
import { useTranslation } from "@/locales/i18n";
import { ScoreSquare } from "@/components/ScoreSquare";
import { formatOptionalText } from "@/lib/formatters";
import { getRatingLevel } from "@/lib/ratingLevels";
import { isBookmarked, toggleBookmark, BOOKMARKS_CHANGED_EVENT } from "@/lib/bookmarks";
import { useAuth } from "@/context/AuthContext";
import { PopArtStar, PopArtArrowRight, PopArtBookmark } from "@/components/icons/PopArtIcons";

interface ProfessorCardProps {
  professor: Professor;
  variant?: "standard" | "compact" | "medium" | "small" | "spotlight";
}

export const ProfessorCard: React.FC<ProfessorCardProps> = ({
  professor,
  variant = "standard",
}) => {
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

  const faculty = locale === "en" ? (professor.facultyEn || professor.faculty) : (professor.facultyVi || professor.faculty);
  const uniName = locale === "en" ? (professor.universityNameEn || professor.universityName) : (professor.universityNameVi || professor.universityName);
  const department = locale === "en" ? (professor.departmentEn || professor.department) : (professor.departmentVi || professor.department);

  const hasReviews = (professor.ratingCount || 0) > 0;
  const ratingDisplay = (hasReviews && typeof professor.ratingAverage === "number") ? professor.ratingAverage.toFixed(1) : null;
  const level = hasReviews && typeof professor.ratingAverage === "number" ? getRatingLevel(professor.ratingAverage) : null;
  const subtitle = formatOptionalText(faculty || department || professor.title, locale);

  const profileHref = `/${locale}/professors/${professor.id}`;

  if (variant === "compact") {
    return (
      <Link
        href={profileHref}
        className="group flex items-center justify-between p-3.5 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000000] hover:shadow-[5px_5px_0px_0px_#000000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all"
      >
        <div className="flex items-center gap-3 min-w-0">
          <ScoreSquare
            score={hasReviews ? professor.ratingAverage : null}
            ratingCount={professor.ratingCount}
            size="md"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-black bg-[#fef9c3] px-1 border border-black">
                {professor.universityShortName}
              </span>
              <span className="text-xs font-bold text-gray-950 truncate group-hover:text-[#e03a3e] transition-colors">
                {professor.name}
              </span>
            </div>
            <p className="text-[11px] text-gray-600 truncate">{subtitle}</p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 pl-3">
          {hasReviews && ratingDisplay ? (
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000000] text-xs font-black"
              style={{ backgroundColor: level ? level.color : "#4ade80" }}
            >
              <PopArtStar className="w-3.5 h-3.5" filled={true} />
              <span>{ratingDisplay}/5</span>
            </div>
          ) : (
            <span className="text-[11px] text-gray-600 font-bold uppercase bg-gray-100 px-1.5 py-0.5 border border-black">
              {locale === "en" ? "Not yet rated" : "Chưa có đánh giá"}
            </span>
          )}

          <button
            type="button"
            onClick={handleToggleBookmark}
            title={bookmarked ? (locale === "vi" ? "Bỏ lưu giảng viên" : "Remove bookmark") : (locale === "vi" ? "Lưu giảng viên" : "Save professor")}
            aria-label={bookmarked ? "Remove bookmark" : "Save professor"}
            className={`p-1.5 border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer ${
              bookmarked ? "bg-[#fef08a] text-black" : "bg-white hover:bg-[#fef9c3] text-black"
            }`}
          >
            <PopArtBookmark className="w-3.5 h-3.5" filled={bookmarked} color="#facc15" />
          </button>
        </div>
      </Link>
    );
  }

  // Standard Neo-Brutalist Card (used on Homepage and Directory)
  const isFeatured = variant === "spotlight";

  return (
    <div
      className={`group flex flex-col justify-between border-2 border-black p-5 transition-all shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-x-[2px] hover:-translate-y-[2px] ${
        isFeatured ? "bg-[#fef9c3]" : "bg-white"
      }`}
    >
      <div>
        {/* Top: Score Square, University info & Bookmark Button */}
        <div className="flex items-start justify-between gap-3.5">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <ScoreSquare
              score={hasReviews ? professor.ratingAverage : null}
              ratingCount={professor.ratingCount}
              size="lg"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#fef9c3] text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000000]">
                  {professor.universityShortName}
                </span>
                <span className="text-[11px] text-gray-700 font-semibold truncate" title={uniName}>
                  {uniName}
                </span>
              </div>

              <Link href={profileHref} className="block mt-1">
                <h3 className="text-base font-black text-black group-hover:text-[#e03a3e] transition-colors line-clamp-1">
                  {professor.name}
                </h3>
              </Link>
              <p className="text-xs text-gray-600 truncate mt-0.5 font-medium">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleBookmark}
            title={bookmarked ? (locale === "vi" ? "Bỏ lưu giảng viên" : "Remove bookmark") : (locale === "vi" ? "Lưu giảng viên" : "Save professor")}
            aria-label={bookmarked ? "Remove bookmark" : "Save professor"}
            className={`p-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0 ${
              bookmarked ? "bg-[#fef08a] text-black" : "bg-white hover:bg-[#fef9c3] text-black"
            }`}
          >
            <PopArtBookmark className="w-4 h-4" filled={bookmarked} color="#facc15" />
          </button>
        </div>

        {/* Muted solid divider */}
        <div className="my-4 border-t-2 border-black/10" />
      </div>

      {/* Bottom: Rating & Profile Action */}
      <div className="flex items-center justify-between text-xs pt-1">
        <div>
          {hasReviews && ratingDisplay ? (
            <div className="flex items-center gap-2">
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 text-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000000] font-black text-xs"
                style={{ backgroundColor: level ? level.color : "#4ade80" }}
              >
                <PopArtStar className="w-3.5 h-3.5" filled={true} />
                <span>{ratingDisplay}</span>
              </div>
              <span className="text-gray-600 text-[11px] font-bold">
                {professor.ratingCount} {locale === "en" ? (professor.ratingCount === 1 ? "review" : "reviews") : "đánh giá"}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-gray-600 font-bold uppercase bg-gray-100 px-1.5 py-0.5 border border-black">
              {locale === "en" ? "Not yet rated" : "Chưa có đánh giá"}
            </span>
          )}
        </div>

        <Link
          href={profileHref}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#e0f2fe] hover:bg-[#bae6fd] text-black text-xs font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:shadow-[3px_3px_0px_0px_#000000] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
        >
          <span>{locale === "en" ? "View profile" : "Xem hồ sơ"}</span>
          <PopArtArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
