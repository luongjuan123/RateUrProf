"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { getProfessorById, getReviewsForProfessor, upvoteReview } from "@/lib/dataService";
import { Professor, Review } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/locales/i18n";
import { ScoreSquare } from "@/components/ScoreSquare";
import { ReportModal } from "@/components/ReportModal";
import { AuthModal } from "@/components/AuthModal";
import { getRatingLevel, getDifficultyLevelByValue, RATING_LEVELS } from "@/lib/ratingLevels";
import { formatReviewerName } from "@/lib/formatters";
import {
  PopArtPencil,
  PopArtBookmark,
  PopArtThumbsUp,
  PopArtShieldAlert,
  PopArtMessageSquare,
  PopArtStar,
  PopArtAward,
  PopArtSmile,
} from "@/components/icons/PopArtIcons";
import { AcademicDoodleSpots } from "@/components/illustrations/AcademicDoodleSpots";
import { isBookmarked, toggleBookmark, BOOKMARKS_CHANGED_EVENT } from "@/lib/bookmarks";

/**
 * Extracts a concise, clean, verified 1-2 sentence description if available.
 * Strips scraper artifacts, HTML, URLs, or noisy linebreaks.
 * Never invents text or biographies.
 */
function getVerifiedDescription(prof: Professor): string | null {
  if (!prof.bio) return null;
  const clean = prof.bio.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!clean || clean.length < 5 || clean.includes("<") || clean.includes("http")) {
    return null;
  }
  // Split into sentences and keep at most 2 sentences
  const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [clean];
  const shortBio = sentences.slice(0, 2).join(" ").trim();
  if (shortBio.length > 200) {
    return shortBio.slice(0, 197) + "...";
  }
  return shortBio;
}

export default function ProfessorDetailClient({ professorId }: { professorId: string }) {
  const { user } = useAuth();
  const { locale, t } = useTranslation();
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting for reviews
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [sortReviews, setSortReviews] = useState<"newest" | "highest" | "lowest" | "helpful">("newest");
  const [displayCount, setDisplayCount] = useState<number>(5);

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedReviewForReport, setSelectedReviewForReport] = useState<Review | null>(null);

  // Bookmark state
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setBookmarked(isBookmarked(professorId, user?.uid));

    const handleBookmarkChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ professorId: string; isBookmarked: boolean }>;
      if (customEvent.detail && customEvent.detail.professorId === professorId) {
        setBookmarked(customEvent.detail.isBookmarked);
      } else if (!customEvent.detail?.professorId) {
        setBookmarked(isBookmarked(professorId, user?.uid));
      }
    };

    window.addEventListener(BOOKMARKS_CHANGED_EVENT, handleBookmarkChange);
    return () => {
      window.removeEventListener(BOOKMARKS_CHANGED_EVENT, handleBookmarkChange);
    };
  }, [professorId, user?.uid]);

  const handleToggleBookmark = () => {
    // BUG-09: Logged out users can still perform actions that require login (bookmarking)
    const uid = user ? user.uid : "guest-user";
    const next = toggleBookmark(professorId, uid);
    setBookmarked(next);
  };

  // BUG-12: Nút Back hiển thị sai thông tin giảng viên (URL thay đổi nhưng giao diện giữ nguyên giảng viên cũ)
  const isBackNavRef = useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      isBackNavRef.current = true;
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const loadData = async () => {
    try {
      // BUG-13: Mất kết nối khiến trang tải vô hạn (Ngắt mạng khi đang tải dữ liệu -> spinner quay vô hạn)
      if (typeof window !== "undefined" && (!navigator.onLine || window.location.search.includes("offline=1"))) {
        setLoading(true);
        // Do not call setLoading(false) - leaves infinite spinner
        return;
      }

      setLoading(true);
      const [prof, revs] = await Promise.all([
        getProfessorById(professorId),
        getReviewsForProfessor(professorId),
      ]);

      if (isBackNavRef.current || (typeof window !== "undefined" && window.location.search.includes("simulate_back=1"))) {
        // BUG-12: On Back navigation, keeps existing professor profile on screen or mismatched data
        const wrongProf = await getProfessorById("dr-tran-thi-b");
        if (wrongProf) setProfessor(wrongProf);
        if (revs) setReviews(revs);
      } else {
        if (prof) {
          setProfessor(prof);
          if (typeof window !== "undefined" && window.location.search.includes("demo_bug02") && revs && revs.length > 0) {
            // BUG-02: Display duplicated review after vote
            setReviews([revs[0], { ...revs[0], id: `${revs[0].id}-dup` }, ...revs.slice(1)]);
          } else if (typeof window !== "undefined" && window.location.search.includes("demo_bug03") && revs && revs.length > 0) {
            // BUG-03: Single account voting multiple times
            setReviews([{ ...revs[0], helpfulCount: (revs[0].helpfulCount || 1) + 8 }, ...revs.slice(1)]);
          } else {
            setReviews(revs || []);
          }
        }
      }
      setLoading(false);
    } catch {
      // BUG-13: Do not dismiss loading spinner on network error
    }
  };

  useEffect(() => {
    loadData();
  }, [professorId]);

  // Deep-link anchor scrolling for specific reviews e.g. #review-[id]
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash && reviews.length > 0) {
      const hash = window.location.hash;
      const targetId = hash.startsWith("#review-") ? hash.replace("#review-", "") : hash.replace("#", "");
      if (targetId) {
        const idx = reviews.findIndex((r) => r.id === targetId);
        if (idx >= 0 && idx >= displayCount) {
          setDisplayCount(idx + 5);
        }
        setTimeout(() => {
          const el = document.getElementById(`review-${targetId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-4", "ring-amber-400", "transition-all");
          }
        }, 350);
      }
    }
  }, [reviews]);

  const handleUpvote = async (reviewId: string) => {
    // BUG-09: Logged out user can still vote without auth modal
    const uid = user ? user.uid : "guest-user";

    // BUG-03: Single account can vote multiple times (increments helpfulCount every click)
    // BUG-02: After voting, review is duplicated and displayed twice
    setReviews((prev) => {
      let targetReview: Review | undefined;
      const updated = prev.map((r) => {
        if (r.id === reviewId || r.id === `${reviewId}-dup`) {
          targetReview = {
            ...r,
            helpfulCount: r.helpfulCount + 1,
            helpfulUserIds: [...(r.helpfulUserIds || []), uid],
          };
          return targetReview;
        }
        return r;
      });

      // BUG-02: Duplicates the review in UI after voting
      if (targetReview && !prev.some((r) => r.id === `${reviewId}-dup`)) {
        return [...updated, { ...targetReview, id: `${reviewId}-dup` }];
      }
      return updated;
    });

    if (user) {
      upvoteReview(reviewId, user.uid).catch(() => {});
    }
  };

  const handleOpenReport = (review: Review) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setSelectedReviewForReport(review);
    setIsReportModalOpen(true);
  };

  // Check if the current user has already reviewed this professor
  const hasUserReviewed = useMemo(() => {
    if (!user) return false;
    return reviews.some((r) => r.userId === user.uid);
  }, [reviews, user]);

  // Distinct courses available in reviews
  const uniqueCourses = useMemo(() => {
    const set = new Set<string>();
    reviews.forEach((r) => {
      if (r.courseName && r.courseName.trim()) {
        set.add(r.courseName.trim());
      }
    });
    return Array.from(set);
  }, [reviews]);

  // Filtered & Sorted reviews
  const filteredReviews = useMemo(() => {
    let result = [...reviews];
    if (selectedCourse !== "all") {
      result = result.filter((r) => r.courseName === selectedCourse);
    }
    result.sort((a, b) => {
      if (sortReviews === "newest") return b.createdAt - a.createdAt;
      if (sortReviews === "highest") return b.overallRating - a.overallRating;
      if (sortReviews === "lowest") return a.overallRating - b.overallRating;
      if (sortReviews === "helpful") return b.helpfulCount - a.helpfulCount;
      return 0;
    });
    return result;
  }, [reviews, selectedCourse, sortReviews]);

  // Authoritative stats from professor record (server aggregate) with fallback to reviews
  const reviewCount = useMemo(() => {
    if (typeof professor?.ratingCount === "number" && professor.ratingCount > 0) {
      return professor.ratingCount;
    }
    if (typeof professor?.publishedReviewCount === "number" && professor.publishedReviewCount > 0) {
      return professor.publishedReviewCount;
    }
    return reviews.length;
  }, [professor?.ratingCount, professor?.publishedReviewCount, reviews.length]);

  const authoritativeRatingAverage = useMemo(() => {
    if (typeof professor?.ratingAverage === "number") {
      return professor.ratingAverage;
    }
    if (typeof professor?.averageRating === "number") {
      return professor.averageRating;
    }
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + (r.overallRating || 0), 0);
      return sum / reviews.length;
    }
    return null;
  }, [professor?.ratingAverage, professor?.averageRating, reviews]);

  const authoritativeTakeAgain = useMemo(() => {
    if (typeof professor?.takeAgainPercent === "number") {
      return professor.takeAgainPercent;
    }
    if (reviews.length > 0) {
      const takeAgainCount = reviews.filter((r) => r.takeAgain).length;
      return Math.round((takeAgainCount / reviews.length) * 100);
    }
    return null;
  }, [professor?.takeAgainPercent, reviews]);

  const authoritativeDifficulty = useMemo(() => {
    if (typeof professor?.difficultyScore === "number") {
      return professor.difficultyScore;
    }
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + (r.criteria?.difficulty ?? 3), 0);
      return sum / reviews.length;
    }
    return null;
  }, [professor?.difficultyScore, reviews]);

  const ratingDistribution = useMemo(() => {
    const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (professor?.ratingDistribution && Object.values(professor.ratingDistribution).some((v) => (v || 0) > 0)) {
      for (const s of [1, 2, 3, 4, 5] as const) {
        dist[s] = professor.ratingDistribution[s] || 0;
      }
    } else if (reviews.length > 0) {
      for (const r of reviews) {
        const star = Math.min(5, Math.max(1, Math.round(r.overallRating || 0))) as 1 | 2 | 3 | 4 | 5;
        dist[star] = (dist[star] || 0) + 1;
      }
    }
    return dist;
  }, [professor?.ratingDistribution, reviews]);

  const hasReviews = reviewCount > 0 && authoritativeRatingAverage !== null;
  const ratingStr = hasReviews && authoritativeRatingAverage != null ? authoritativeRatingAverage.toFixed(1) : null;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-black border-t-transparent animate-spin mx-auto rounded-none" />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          {t("professorDetail.loading") || "Đang tải hồ sơ giảng viên..."}
        </p>
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-black uppercase text-gray-900">
          {t("professorDetail.notFoundTitle") || "Không tìm thấy hồ sơ giảng viên"}
        </h2>
        <p className="text-xs text-gray-500">
          {t("professorDetail.notFoundSubtitle") || "Hồ sơ này không tồn tại hoặc đã được cập nhật lại mã định danh."}
        </p>
        <Link
          href={`/${locale}`}
          className="inline-block px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold uppercase rounded-none transition-colors"
        >
          {locale === "en" ? "Back to Search" : "Trở về tìm kiếm"}
        </Link>
      </div>
    );
  }

  // Verified academic title: GS, PGS, TS, ThS
  const verifiedAcademicTitle = professor.academicTitle || (professor.title && !professor.title.includes("Giảng viên") ? professor.title : null);

  // University and faculty display
  const uniName = locale === "en" ? (professor.universityNameEn || professor.universityName) : (professor.universityNameVi || professor.universityName);
  const uniShort = professor.universityShortName;
  const faculty = locale === "en" ? (professor.facultyEn || professor.faculty) : (professor.facultyVi || professor.faculty);
  const department = locale === "en" ? (professor.departmentEn || professor.department) : (professor.departmentVi || professor.department);

  const affiliationParts: string[] = [];
  if (department) affiliationParts.push(department);
  else if (faculty) affiliationParts.push(faculty);
  if (uniName) affiliationParts.push(`${uniName}${uniShort ? ` (${uniShort})` : ""}`);
  const affiliationLine = affiliationParts.join(" • ");

  const shortDescription = getVerifiedDescription(professor);
  const visibleReviews = filteredReviews.slice(0, displayCount);
  const hasMoreReviews = displayCount < filteredReviews.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <Link href={`/${locale}`} className="hover:text-[#1d4ed8]">
          {t("professorDetail.breadcrumbHome") || (locale === "en" ? "Home" : "Trang chủ")}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-bold truncate">
          {verifiedAcademicTitle ? `${verifiedAcademicTitle} ` : ""}{professor.name}
        </span>
      </div>

      {/* 1. RATE MY PROFESSORS STYLE HEADER: PROFESSOR INFO & RATING SUMMARY WITH SPOT DOODLES (TWO SIDES AND UP) */}
      <div className="relative pt-4 sm:pt-6">
        {/* Dynamic & Interactive Academic Doodle Spots (Randomized count & academic illustrations) */}
        <AcademicDoodleSpots />

        {/* The Main Professor Card */}
        <div className="bg-white border border-gray-200 p-6 sm:p-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Overall Quality, Professor Info, Metrics, Rate CTA */}
          <div className="lg:col-span-7 space-y-5">
            {/* Professor Identity & Quality Score in a Square */}
            <div className="flex items-start gap-4 sm:gap-5">
              <ScoreSquare
                score={hasReviews ? authoritativeRatingAverage : null}
                ratingCount={reviewCount}
                size="xl"
              />

              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {verifiedAcademicTitle && (
                    <span className="px-2 py-0.5 bg-[#eff6ff] text-[#1d4ed8] font-mono font-bold text-xs uppercase border border-[#bfdbfe]">
                      {verifiedAcademicTitle}
                    </span>
                  )}
                  {uniShort && (
                    <span className="px-2 py-0.5 bg-[#eff6ff] text-[#1d4ed8] font-mono font-bold text-xs uppercase border border-[#bfdbfe]">
                      {uniShort}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                  {verifiedAcademicTitle ? `${verifiedAcademicTitle} ` : ""}{professor.name}
                </h1>

                {affiliationLine && (
                  <p className="text-xs sm:text-sm text-gray-800 font-bold">
                    {affiliationLine}
                  </p>
                )}

                {shortDescription && (
                  <p className="text-xs text-gray-700 font-medium leading-relaxed pt-0.5">
                    {shortDescription}
                  </p>
                )}

                <p className="text-xs text-gray-700 font-bold pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-black font-black uppercase text-[10px] sm:text-[11px] tracking-wider">
                    {t("professorDetail.overallQualityLabel") || "Chất lượng tổng thể"}:
                  </span>
                  <span>
                    {hasReviews
                      ? (t("professorDetail.basedOnRatingsCount", { count: reviewCount }) || `dựa trên ${reviewCount} lượt đánh giá`)
                      : (t("professorDetail.notRatedYet") || "Chưa có đánh giá")}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Metrics: Would take again %, Difficulty, Total Ratings (Blue & White) */}
            <div className="flex items-center gap-3 sm:gap-4 pt-1 flex-wrap">
              <div className="p-3 sm:p-3.5 bg-[#eff6ff] border border-[#bfdbfe] min-w-[125px] flex-1">
                <div className="text-2xl sm:text-3xl font-black text-[#1d4ed8]">
                  {hasReviews && authoritativeTakeAgain != null ? `${Math.round(authoritativeTakeAgain)}%` : "N/A"}
                </div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1d4ed8] mt-0.5">
                  {t("professorDetail.takeAgainPercent") || "Muốn học lại"}
                </div>
              </div>

              <div className="p-3 sm:p-3.5 bg-[#eff6ff] border border-[#bfdbfe] min-w-[125px] flex-1">
                <div className="text-2xl sm:text-3xl font-black text-[#1d4ed8]">
                  {hasReviews && authoritativeDifficulty != null ? `${authoritativeDifficulty.toFixed(1)}` : "N/A"}
                </div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1d4ed8] mt-0.5">
                  {t("professorDetail.difficultyScore") || "Mức độ khó"}
                </div>
              </div>

              <div className="p-3 sm:p-3.5 bg-[#eff6ff] border border-[#bfdbfe] min-w-[125px] flex-1">
                <div className="text-2xl sm:text-3xl font-black text-[#1d4ed8]">
                  {reviewCount}
                </div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1d4ed8] mt-0.5">
                  {locale === "vi" ? "Lượt đánh giá" : "Total Ratings"}
                </div>
              </div>
            </div>

            {/* Actions: Rate Professor & Bookmark Professor */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href={`/${locale}/professors/${professor.id}/rate`}
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    setIsAuthModalOpen(true);
                  }
                }}
                className={`inline-flex items-center justify-center gap-2 px-8 py-3.5 text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                  hasUserReviewed
                    ? "bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border-[#bfdbfe]"
                    : "bg-[#1d4ed8] hover:bg-[#1e40af] text-white border-[#1d4ed8]"
                }`}
              >
                <PopArtPencil className="w-4 h-4" />
                <span>{hasUserReviewed
                  ? (locale === "vi" ? "Sửa đánh giá" : "Edit Review")
                  : (t("professorDetail.writeReviewForProf") || "Viết đánh giá")}</span>
              </Link>

              <button
                type="button"
                onClick={handleToggleBookmark}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                  bookmarked
                    ? "bg-[#eff6ff] text-[#1d4ed8] border-[#1d4ed8]"
                    : "bg-white hover:bg-[#eff6ff] hover:text-[#1d4ed8] hover:border-[#1d4ed8] text-gray-700 border-gray-300"
                }`}
              >
                <PopArtBookmark className="w-4 h-4" filled={bookmarked} color="#1d4ed8" />
                <span>
                  {bookmarked
                    ? t("professorDetail.savedProfessor") || (locale === "vi" ? "Đã lưu" : "Saved")
                    : t("professorDetail.saveProfessor") || (locale === "vi" ? "Lưu giảng viên" : "Save Professor")}
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Rating Distribution */}
          <div className="lg:col-span-5 bg-gray-50 p-6 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                <PopArtStar className="w-3.5 h-3.5 text-[#1d4ed8]" />
                <span>{t("professorDetail.ratingDistribution") || "Phân bố đánh giá"}</span>
              </h3>
              <span className="px-2 py-0.5 bg-[#1d4ed8] text-white font-mono font-bold text-[9px] uppercase border border-[#1d4ed8]">
                {reviewCount} REVIEWS
              </span>
            </div>

            {hasReviews ? (
              <div className="space-y-2.5 pt-1">
                {[...RATING_LEVELS].reverse().map((lvl) => {
                  const label =
                    (lvl.key === "awesome"
                      ? t("professorDetail.ratingAwesome")
                      : lvl.key === "great"
                      ? t("professorDetail.ratingGreat")
                      : lvl.key === "good"
                      ? t("professorDetail.ratingGood")
                      : lvl.key === "ok"
                      ? t("professorDetail.ratingOk")
                      : t("professorDetail.ratingAwful")) ||
                    (locale === "vi" ? lvl.labelVi : lvl.labelEn);
                  const star = lvl.level;
                  const color = lvl.color;
                  const count = ratingDistribution[star as 1 | 2 | 3 | 4 | 5] || 0;
                  const percent = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs font-bold">
                      <span className="w-24 text-black shrink-0 font-mono text-[11px]">
                        {label}
                      </span>
                      <div className="flex-1 h-3 bg-white border border-gray-200 overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{ width: `${percent}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="w-8 text-right text-black font-mono font-black shrink-0">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center space-y-1">
                <p className="text-xs text-black/70 font-semibold">
                  {t("professorDetail.noDistributionYet") || "Biểu đồ phân bố sẽ hiển thị khi có đánh giá đầu tiên."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* 2. STUDENT RATINGS & REVIEWS SECTION */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-3 gap-4">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
            {t("professorDetail.publishedReviewsTitle", { count: filteredReviews.length }) || `Đánh giá từ sinh viên (${filteredReviews.length})`}
          </h2>

          {/* Course filter & Sort controls */}
          {reviews.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
              {uniqueCourses.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-black font-bold uppercase text-[10px]">
                    {t("professorDetail.course") || "Môn:"}
                  </span>
                  <select
                    value={selectedCourse}
                    onChange={(e) => {
                      setSelectedCourse(e.target.value);
                      setDisplayCount(5);
                    }}
                    className="p-1.5 bg-white border border-gray-200 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 font-bold text-black text-xs cursor-pointer"
                  >
                    <option value="all">{t("professorDetail.allCourses") || "Tất cả môn học"}</option>
                    {uniqueCourses.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-black font-bold uppercase text-[10px]">
                  {t("professorDetail.sortBy") || "Sắp xếp theo:"}
                </span>
                <select
                  value={sortReviews}
                  onChange={(e) => {
                    setSortReviews(e.target.value as "newest" | "highest" | "lowest" | "helpful");
                    setDisplayCount(5);
                  }}
                  className="p-1.5 bg-white border border-gray-200 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 font-bold text-black text-xs cursor-pointer"
                >
                  <option value="newest">{t("professorDetail.sortNewest") || "Mới nhất"}</option>
                  <option value="highest">{t("professorDetail.sortHighest") || "Đánh giá cao nhất"}</option>
                  <option value="lowest">{t("professorDetail.sortLowest") || "Đánh giá thấp nhất"}</option>
                  <option value="helpful">{t("professorDetail.sortHelpful") || "Hữu ích nhất"}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {filteredReviews.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white border border-gray-200 space-y-3">
            <div className="w-12 h-12 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center mx-auto">
              <PopArtMessageSquare className="w-6 h-6" />
            </div>
            <h4 className="font-mono font-bold text-slate-900 text-base uppercase">
              {t("professorDetail.noReviewsTitle") || (locale === "vi" ? "Chưa có đánh giá nào" : "No ratings yet")}
            </h4>
            <div className="pt-2">
              <Link
                href={`/${locale}/professors/${professor.id}/rate`}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-mono font-bold uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
              >
                <PopArtPencil className="w-4 h-4" />
                <span>{t("professorDetail.writeFirstReview") || (locale === "vi" ? "Viết đánh giá đầu tiên" : "Write First Review")}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleReviews.map((rev) => {
              const hasUpvoted = user && rev.helpfulUserIds?.includes(user.uid);
              const cardAccent = "border-l-4 border-l-[#1d4ed8]";

              return (
                <div
                  key={rev.id}
                  id={`review-${rev.id}`}
                  className={`bg-white border border-gray-200 transition-colors p-6 space-y-4 ${cardAccent}`}
                >
                  {/* Top Bar of Review */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const level = getRatingLevel(rev.overallRating);
                        const diffVal = rev.criteria?.difficulty ?? 3;
                        const diffLevel = getDifficultyLevelByValue(diffVal);
                        return (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Quality Score Box */}
                            <div
                              className="flex flex-col items-center justify-center px-2.5 sm:px-3 py-1 text-[#1d4ed8] bg-[#eff6ff] border border-[#bfdbfe] min-w-[64px] sm:min-w-[70px]"
                              title={`${locale === "vi" ? "Chất lượng" : "Quality"}: ${rev.overallRating.toFixed(1)}/5`}
                            >
                              <span className="text-[8px] sm:text-[9px] uppercase tracking-wider font-mono font-bold text-[#1d4ed8]/80">
                                {locale === "vi" ? level.labelVi : level.labelEn}
                              </span>
                              <span className="text-sm sm:text-base font-mono font-bold text-[#1d4ed8] leading-none">
                                {rev.overallRating.toFixed(1)}
                              </span>
                            </div>

                            {/* Difficulty Score Box */}
                            <div
                              className="flex flex-col items-center justify-center px-2 sm:px-2.5 py-1 text-slate-700 bg-slate-50 border border-slate-200 min-w-[60px] sm:min-w-[65px]"
                              title={`${locale === "vi" ? "Độ khó" : "Difficulty"}: ${diffVal}/5 (${locale === "vi" ? diffLevel.labelVi : diffLevel.labelEn})`}
                            >
                              <span className="text-[8px] sm:text-[9px] uppercase tracking-wider font-mono font-bold text-slate-500">
                                {locale === "vi" ? "ĐỘ KHÓ" : "DIFFICULTY"}
                              </span>
                              <span className="text-sm sm:text-base font-mono font-bold text-slate-800 leading-none">
                                {diffVal.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="min-w-0">
                        <div className="font-bold text-base text-slate-900 truncate">
                          {rev.courseName}
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium flex items-center gap-2">
                          <span>{formatReviewerName(rev.userDisplayName, locale as "vi" | "en")}</span>
                          <span>•</span>
                          <span>{new Date(rev.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Edit button if this review belongs to the logged-in student */}
                    {user?.uid && rev.userId === user.uid && (
                      <Link
                        href={`/${locale}/professors/${professor.id}/rate`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe] text-xs font-mono font-bold uppercase tracking-wider transition-colors self-start sm:self-center"
                      >
                        <PopArtPencil className="w-3.5 h-3.5" />
                        <span>{locale === "vi" ? "Sửa đánh giá" : "Edit Review"}</span>
                      </Link>
                    )}
                  </div>

                  {/* Badges / Course Meta */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {(() => {
                      const diffVal = rev.criteria?.difficulty ?? 3;
                      const diffLevel = getDifficultyLevelByValue(diffVal);
                      return (
                        <span
                          className="px-2 py-0.5 border border-slate-200 bg-slate-50 text-slate-700 font-medium"
                        >
                          {locale === "vi" ? "Độ khó:" : "Difficulty:"}{" "}
                          <span className="font-bold text-slate-900">{diffVal}/5</span>
                          {" "}
                          <span className="text-[11px] opacity-90">
                            ({locale === "vi" ? diffLevel.labelVi : diffLevel.labelEn})
                          </span>
                        </span>
                      );
                    })()}
                    {rev.gradeReceived && (
                      <span className="px-2 py-0.5 bg-[#eff6ff] font-bold text-[#1d4ed8] border border-[#bfdbfe]">
                        {t("professorDetail.grade") || "Điểm:"} {rev.gradeReceived}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-gray-50 text-black font-medium border border-gray-200">
                      {rev.attendanceMandatory
                        ? t("professorDetail.attendanceMandatory") || "Điểm danh: Bắt buộc"
                        : t("professorDetail.attendanceOptional") || "Điểm danh: Tự do"}
                    </span>
                    <span className={`px-2 py-0.5 border font-medium ${
                      rev.takeAgain
                        ? "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }`}>
                      {rev.takeAgain
                        ? t("professorDetail.takeAgainYes") || "Muốn học lại: Có"
                        : t("professorDetail.takeAgainNo") || "Muốn học lại: Không"}
                    </span>
                  </div>

                  {/* Comment Body */}
                  <p className="text-sm text-gray-800 font-normal leading-relaxed whitespace-pre-line">
                    {rev.comment}
                  </p>

                  {/* Tags */}
                  {rev.tags && rev.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {rev.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bottom Actions: Helpful & Report */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                    <button
                      onClick={() => handleUpvote(rev.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 border font-bold text-xs transition-colors cursor-pointer ${
                        hasUpvoted
                          ? "bg-[#eff6ff] text-[#1d4ed8] border-[#1d4ed8]"
                          : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      <PopArtThumbsUp className="w-4 h-4" active={Boolean(hasUpvoted)} />
                      <span>{t("professorDetail.helpful", { count: rev.helpfulCount }) || `Hữu ích (${rev.helpfulCount})`}</span>
                    </button>

                    <button
                      onClick={() => handleOpenReport(rev)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-gray-600 hover:text-black hover:bg-gray-50 border border-gray-200 font-medium transition-colors cursor-pointer"
                      title={t("professorDetail.reportTitle") || "Báo cáo bình luận vi phạm"}
                    >
                      <PopArtShieldAlert className="w-3.5 h-3.5" />
                      <span>{t("professorDetail.report") || "Báo cáo"}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Load more button */}
            {hasMoreReviews && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setDisplayCount((prev) => prev + 5)}
                  className="px-8 py-3 bg-white hover:bg-gray-50 text-black border border-gray-300 font-bold text-xs uppercase transition-colors cursor-pointer"
                >
                  {t("professorDetail.loadMore") || "Tải thêm đánh giá"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>



      {/* Report Inappropriate Review Modal */}
      {selectedReviewForReport && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => {
            setIsReportModalOpen(false);
            setSelectedReviewForReport(null);
          }}
          review={selectedReviewForReport}
        />
      )}

      {/* Auth Modal Trigger */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
