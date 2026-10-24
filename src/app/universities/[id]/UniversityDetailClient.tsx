"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUniversityById, getSchoolReviewsAndStats, upvoteSchoolReview } from "@/lib/dataService";
import { University, SchoolReview, SchoolCriteriaRatings } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/locales/i18n";
import { AuthModal } from "@/components/AuthModal";
import { formatReviewerName } from "@/lib/formatters";
import {
  PopArtBuilding,
  PopArtMapPin,
  PopArtGlobe,
  PopArtExternalLink,
  PopArtPencil,
  PopArtThumbsUp,
  PopArtShieldAlert,
  PopArtShield,
  PopArtBriefcase,
  PopArtAward,
  PopArtSmile,
  PopArtFlag,
  PopArtWifi,
  PopArtUtensils,
  PopArtUsers,
  PopArtSearch,
  PopArtChevronRight,
  PopArtArrowUpDown,
  PopArtStar,
} from "@/components/icons/PopArtIcons";
import { AcademicDoodleSpots } from "@/components/illustrations/AcademicDoodleSpots";

const CRITERIA_COLORS: Record<string, { pillBg: string; text: string; barColor: string }> = {
  safety: { pillBg: "bg-[#dbeafe]", text: "text-[#1e40af]", barColor: "bg-[#38bdf8]" },
  location: { pillBg: "bg-[#fef3c7]", text: "text-[#92400e]", barColor: "bg-[#f59e0b]" },
  opportunities: { pillBg: "bg-[#dcfce7]", text: "text-[#166534]", barColor: "bg-[#22c55e]" },
  reputation: { pillBg: "bg-[#ede9fe]", text: "text-[#5b21b6]", barColor: "bg-[#a855f7]" },
  facilities: { pillBg: "bg-[#ffedd5]", text: "text-[#9a3412]", barColor: "bg-[#fb923c]" },
  happiness: { pillBg: "bg-[#fef9c3]", text: "text-[#854d0e]", barColor: "bg-[#facc15]" },
  clubs: { pillBg: "bg-[#fee2e2]", text: "text-[#991b1b]", barColor: "bg-[#ef4444]" },
  internet: { pillBg: "bg-[#e0f2fe]", text: "text-[#075985]", barColor: "bg-[#0ea5e9]" },
  social: { pillBg: "bg-[#f3e8ff]", text: "text-[#6b21a8]", barColor: "bg-[#c084fc]" },
  food: { pillBg: "bg-[#fce7f3]", text: "text-[#9d174d]", barColor: "bg-[#ec4899]" },
};

function getScoreBgColor(score: number | null | undefined): string {
  if (score == null) return "bg-gray-100 text-gray-700 border-2 border-black";
  if (score >= 4.0) return "bg-[#6ee7b7] text-black font-black border-2 border-black";
  if (score >= 3.0) return "bg-[#fef9c3] text-black font-black border-2 border-black";
  return "bg-[#fee2e2] text-black font-black border-2 border-black";
}

function getCriteriaScoreBadge(score: number | null | undefined): string {
  if (score == null) return "bg-gray-200 text-gray-700 border-2 border-black";
  if (score >= 4.0) return "bg-[#6ee7b7] text-black font-black border-2 border-black";
  if (score >= 3.0) return "bg-[#fef9c3] text-black font-black border-2 border-black";
  return "bg-[#fee2e2] text-black font-black border-2 border-black";
}

function getQualityLabel(score: number | null | undefined, locale: string): string {
  if (score == null) return locale === "vi" ? "Chưa có điểm" : "No score yet";
  if (score >= 4.5) return locale === "vi" ? "Xuất sắc" : "Awesome";
  if (score >= 3.5) return locale === "vi" ? "Tốt" : "Great";
  if (score >= 2.5) return locale === "vi" ? "Trung bình" : "Average";
  return locale === "vi" ? "Kém" : "Awful";
}

type SortOption = "newest" | "highest" | "lowest" | "helpful";

export default function UniversityDetailClient({ universityId }: { universityId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { locale, t } = useTranslation();

  const [university, setUniversity] = useState<University | null>(null);
  const [schoolReviews, setSchoolReviews] = useState<SchoolReview[]>([]);
  const [schoolStats, setSchoolStats] = useState<{
    total: number;
    ratingAverage: number | null;
    criteriaAverages: SchoolCriteriaRatings | null;
  }>({ total: 0, ratingAverage: null, criteriaAverages: null });

  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [profSearchQuery, setProfSearchQuery] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [uni, revStats] = await Promise.all([
        getUniversityById(universityId),
        getSchoolReviewsAndStats(universityId),
      ]);

      if (uni) {
        setUniversity(uni);
        setSchoolReviews(revStats.reviews || []);
        setSchoolStats({
          total: revStats.total || 0,
          ratingAverage: revStats.ratingAverage ?? uni.ratingAverage ?? null,
          criteriaAverages: revStats.criteriaAverages || null,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [universityId]);

  const handleUpvote = async (reviewId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const success = await upvoteSchoolReview(reviewId, user.uid);
    if (success) {
      setSchoolReviews((prev) =>
        prev.map((r) => {
          if (r.id === reviewId) {
            const userIds = r.helpfulUserIds || [];
            const hasVoted = userIds.includes(user.uid);
            return {
              ...r,
              helpfulCount: hasVoted ? Math.max(0, r.helpfulCount - 1) : r.helpfulCount + 1,
              helpfulUserIds: hasVoted
                ? userIds.filter((id) => id !== user.uid)
                : [...userIds, user.uid],
            };
          }
          return r;
        })
      );
    }
  };

  const handleProfSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!university) return;
    const q = profSearchQuery.trim();
    if (q) {
      router.push(`/${locale}?mode=professor&q=${encodeURIComponent(`${q} ${university.shortName}`)}`);
    } else {
      router.push(`/${locale}?mode=professor&q=${encodeURIComponent(university.shortName)}`);
    }
  };

  // Check if the current user has already reviewed this school
  const hasUserReviewed = useMemo(() => {
    if (!user) return false;
    return schoolReviews.some((r) => r.userId === user.uid);
  }, [schoolReviews, user]);

  const sortedReviews = useMemo(() => {
    const list = [...schoolReviews];
    switch (sortBy) {
      case "highest":
        return list.sort((a, b) => b.overallRating - a.overallRating);
      case "lowest":
        return list.sort((a, b) => a.overallRating - b.overallRating);
      case "helpful":
        return list.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
      case "newest":
      default:
        return list.sort((a, b) => b.createdAt - a.createdAt);
    }
  }, [schoolReviews, sortBy]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-[#e03a3e] border-t-transparent animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-4">
          {locale === "vi" ? "Đang tải thông tin trường đại học..." : "Loading university profile..."}
        </p>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-black uppercase text-gray-900">
          {locale === "vi" ? "Không tìm thấy trường đại học" : "University Not Found"}
        </h2>
        <Link
          href={`/${locale}`}
          className="inline-block px-5 py-2.5 bg-black text-white text-xs font-bold uppercase"
        >
          {locale === "vi" ? "Trở về trang chủ" : "Back to Home"}
        </Link>
      </div>
    );
  }

  const uniName = locale === "en" ? (university.englishName || university.name) : university.name;
  const locationText = [university.city, university.region].filter(Boolean).join(", ");
  const crit = schoolStats.criteriaAverages;

  const criteriaItems = [
    // Column 1
    { key: "safety", label: t("universityDetail.critSafety") || (locale === "vi" ? "An ninh & An toàn" : "Safety"), icon: PopArtShield, score: crit?.safety },
    { key: "location", label: t("universityDetail.critLocation") || (locale === "vi" ? "Vị trí & Giao thông" : "Location"), icon: PopArtMapPin, score: crit?.location },
    { key: "opportunities", label: t("universityDetail.critOpportunities") || (locale === "vi" ? "Cơ hội việc làm" : "Opportunities"), icon: PopArtBriefcase, score: crit?.opportunities },
    { key: "reputation", label: t("universityDetail.critReputation") || (locale === "vi" ? "Danh tiếng & Uy tín" : "Reputation"), icon: PopArtAward, score: crit?.reputation },
    { key: "facilities", label: t("universityDetail.critFacilities") || (locale === "vi" ? "Cơ sở vật chất" : "Facilities"), icon: PopArtBuilding, score: crit?.facilities },
    // Column 2
    { key: "happiness", label: t("universityDetail.critHappiness") || (locale === "vi" ? "Mức độ hài lòng" : "Happiness"), icon: PopArtSmile, score: crit?.happiness },
    { key: "clubs", label: t("universityDetail.critClubs") || (locale === "vi" ? "Câu lạc bộ" : "Clubs"), icon: PopArtFlag, score: crit?.clubs },
    { key: "internet", label: t("universityDetail.critInternet") || (locale === "vi" ? "Mạng Internet & Wifi" : "Internet"), icon: PopArtWifi, score: crit?.internet },
    { key: "social", label: t("universityDetail.critSocial") || (locale === "vi" ? "Đời sống sinh viên" : "Social"), icon: PopArtUsers, score: crit?.social },
    { key: "food", label: t("universityDetail.critFood") || (locale === "vi" ? "Ẩm thực & Căn tin" : "Food"), icon: PopArtUtensils, score: crit?.food },
  ];

  const col1 = criteriaItems.slice(0, 5);
  const col2 = criteriaItems.slice(5, 10);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <Link href={`/${locale}`} className="hover:text-black">
          {t("universityDetail.breadcrumbHome") || (locale === "vi" ? "Trang chủ" : "Home")}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-bold">{university.shortName}</span>
      </div>

      {/* 1. RATEMYPROFESSORS STYLE SCHOOL HEADER & RATING BREAKDOWN WITH SPOT DOODLES (TWO SIDES AND UP) */}
      <div className="relative pt-4 sm:pt-6">
        {/* Dynamic & Interactive Academic Doodle Spots (Randomized count & academic illustrations) */}
        <AcademicDoodleSpots />

        {/* The Main School Card */}
        <div className="bg-white border border-gray-200 p-6 sm:p-8 space-y-6 relative">

        {/* Top identity & CTA actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gray-200 pb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-[#e03a3e] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#e03a3e]">
                {university.shortName}
              </span>
              {locationText && (
                <span className="px-2.5 py-1 bg-[#e0f2fe] text-black text-xs font-mono font-bold flex items-center gap-1.5 border border-sky-200">
                  <PopArtMapPin className="w-3.5 h-3.5 text-[#0284c7]" />
                  <span>{locationText}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-mono font-black text-black tracking-tight">
              {uniName}
            </h1>

            {university.officialWebsite && (
              <div className="pt-0.5">
                <a
                  href={university.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 hover:bg-gray-100 text-black text-xs font-mono font-bold border border-gray-200 transition-colors"
                >
                  <PopArtGlobe className="w-3.5 h-3.5" />
                  <span>{university.officialDomain || university.officialWebsite}</span>
                  <PopArtExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={`/${locale}/universities/${university.id}/rate`}
              onClick={(e) => {
                if (!user) {
                  e.preventDefault();
                  setIsAuthModalOpen(true);
                }
              }}
              className={`inline-flex items-center justify-center gap-2 px-8 py-3.5 text-xs font-mono font-black uppercase tracking-wider transition-colors border cursor-pointer ${
                hasUserReviewed
                  ? "bg-[#fef9c3] hover:bg-[#fde047] text-black border-gray-300"
                  : "bg-[#e03a3e] hover:bg-[#b91c1c] text-white border-[#e03a3e]"
              }`}
            >
              <PopArtPencil className="w-4 h-4" />
              <span>{hasUserReviewed
                ? (locale === "vi" ? "Sửa đánh giá trường" : "Edit School Review")
                : (t("universityDetail.rateSchool") || (locale === "vi" ? "Đánh giá trường" : "Rate School"))}</span>
            </Link>
          </div>
        </div>

        {/* Rating Breakdown Grid matching RateMyProfessors school page layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
          {/* Big Score: Overall Quality */}
          <div className="lg:col-span-4 p-5 sm:p-6 border border-gray-200 space-y-3 text-center lg:text-left bg-gray-50">
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <span className="px-2.5 py-0.5 bg-black text-white font-mono font-bold text-[10px] uppercase tracking-wider border border-black flex items-center gap-1">
                <PopArtStar className="w-3 h-3 text-[#facc15]" />
                <span>OVERALL QUALITY</span>
              </span>
            </div>

            <div className="flex items-baseline justify-center lg:justify-start gap-2">
              <span className="text-6xl sm:text-7xl font-mono font-black text-black tracking-tight">
                {schoolStats.total > 0 && schoolStats.ratingAverage != null ? schoolStats.ratingAverage.toFixed(1) : "N/A"}
              </span>
              <span className="text-2xl font-mono font-black text-gray-500">/ 5</span>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-black">
                {t("universityDetail.overallQuality") || (locale === "vi" ? "Chất lượng tổng thể" : "Overall Quality")}
              </div>
              <div className="inline-block px-2.5 py-0.5 bg-[#e03a3e] text-white text-xs font-mono font-bold">
                {schoolStats.total > 0 && schoolStats.ratingAverage != null
                  ? getQualityLabel(schoolStats.ratingAverage, locale)
                  : (locale === "vi" ? "Chưa có đánh giá" : "No ratings yet")}
              </div>
            </div>

            <p className="text-xs font-mono text-gray-700 font-bold pt-1">
              {schoolStats.total > 0
                ? (t("universityDetail.basedOnRatingsCount", { count: schoolStats.total }) ||
                    (locale === "vi"
                      ? `Dựa trên ${schoolStats.total} lượt đánh giá từ sinh viên`
                      : `Based on ${schoolStats.total} student ratings`))
                : (locale === "vi" ? "Chưa có lượt đánh giá từ sinh viên" : "No ratings from students yet")}
            </p>
          </div>

          {/* 10 Criteria in 2 Columns with Colorful Badges & 5-Segment Meters */}
          <div className="lg:col-span-8 bg-white p-5 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2.5 mb-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#facc15] border border-gray-300 inline-block" />
                <span>Tiêu chí đánh giá cơ sở ({col1.length + col2.length})</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-gray-500 uppercase">Thang điểm 5.0</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
              {/* Column 1 */}
              <div className="space-y-3">
                {col1.map((item) => {
                  const Icon = item.icon;
                  const cTheme = CRITERIA_COLORS[item.key] || { pillBg: "bg-white", text: "text-black", barColor: "bg-[#facc15]" };
                  return (
                    <div key={item.key} className="flex items-center justify-between text-xs font-mono font-bold text-gray-900 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-6 h-6 flex items-center justify-center border border-gray-200 shrink-0 ${cTheme.pillBg}`}>
                          <Icon className={`w-3.5 h-3.5 ${cTheme.text}`} />
                        </span>
                        <span className="truncate text-[11px] sm:text-xs">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 5-segment mini bars */}
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((seg) => {
                            const active = item.score != null && seg <= Math.round(item.score);
                            return (
                              <div
                                key={seg}
                                className={`w-2.5 h-3 border border-gray-300 ${
                                  active ? cTheme.barColor : "bg-gray-100"
                                }`}
                              />
                            );
                          })}
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-mono font-bold min-w-[32px] text-center border border-gray-200 ${getCriteriaScoreBadge(item.score)}`}>
                          {item.score != null ? item.score.toFixed(1) : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Column 2 */}
              <div className="space-y-3">
                {col2.map((item) => {
                  const Icon = item.icon;
                  const cTheme = CRITERIA_COLORS[item.key] || { pillBg: "bg-white", text: "text-black", barColor: "bg-[#facc15]" };
                  return (
                    <div key={item.key} className="flex items-center justify-between text-xs font-mono font-bold text-gray-900 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-6 h-6 flex items-center justify-center border border-gray-200 shrink-0 ${cTheme.pillBg}`}>
                          <Icon className={`w-3.5 h-3.5 ${cTheme.text}`} />
                        </span>
                        <span className="truncate text-[11px] sm:text-xs">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 5-segment mini bars */}
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((seg) => {
                            const active = item.score != null && seg <= Math.round(item.score);
                            return (
                              <div
                                key={seg}
                                className={`w-2.5 h-3 border border-gray-300 ${
                                  active ? cTheme.barColor : "bg-gray-100"
                                }`}
                              />
                            );
                          })}
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-mono font-bold min-w-[32px] text-center border border-gray-200 ${getCriteriaScoreBadge(item.score)}`}>
                          {item.score != null ? item.score.toFixed(1) : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* 2. SIMPLE SEARCH PROFESSOR AT THIS SCHOOL BAR */}
      <form onSubmit={handleProfSearch} className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <PopArtSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={profSearchQuery}
            onChange={(e) => setProfSearchQuery(e.target.value)}
            placeholder={
              t("universityDetail.searchProfPlaceholder") ||
              (locale === "vi" ? "Nhập tên giảng viên..." : "Search by name...")
            }
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 text-xs sm:text-sm font-mono font-bold text-black outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-black"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-black hover:bg-[#e03a3e] text-white text-xs sm:text-sm font-mono font-bold uppercase border border-black transition-colors shrink-0 cursor-pointer"
        >
          {t("universityDetail.searchProfButton") || (locale === "vi" ? "Tìm kiếm" : "Search")}
        </button>
      </form>

      {/* 3. STUDENT RATINGS & REVIEWS SECTION */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
          <h2 className="text-xl sm:text-2xl font-mono font-bold uppercase tracking-tight text-black flex items-center gap-2">
            <span className="w-3 h-3 bg-[#e03a3e] inline-block" />
            <span>
              {t("universityDetail.schoolRatingsTitle", { count: schoolStats.total }) ||
                (locale === "vi"
                  ? `${schoolStats.total} Lượt đánh giá từ sinh viên`
                  : `${schoolStats.total} Student Ratings`)}
            </span>
          </h2>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Sort Dropdown */}
            {schoolReviews.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono font-bold text-black flex items-center gap-1 uppercase">
                  <PopArtArrowUpDown className="w-3.5 h-3.5" />
                  {t("universityDetail.sortBy") || (locale === "vi" ? "Sắp xếp theo:" : "Sort by:")}
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-white border border-gray-200 text-xs font-mono font-bold px-2.5 py-1.5 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus:border-black cursor-pointer"
                >
                  <option value="newest">{t("universityDetail.sortNewest") || (locale === "vi" ? "Mới nhất" : "Newest")}</option>
                  <option value="highest">{t("universityDetail.sortHighest") || (locale === "vi" ? "Điểm cao nhất" : "Highest Rating")}</option>
                  <option value="lowest">{t("universityDetail.sortLowest") || (locale === "vi" ? "Điểm thấp nhất" : "Lowest Rating")}</option>
                  <option value="helpful">{t("universityDetail.sortHelpful") || (locale === "vi" ? "Hữu ích nhất" : "Most Helpful")}</option>
                </select>
              </div>
            )}

            <Link
              href={`/${locale}/universities/${university.id}/rate`}
              className="text-xs font-mono font-bold uppercase tracking-wider text-[#e03a3e] hover:underline inline-flex items-center gap-1"
            >
              <span>{hasUserReviewed
                ? (locale === "vi" ? "Sửa đánh giá trường" : "Edit School Review")
                : (t("universityDetail.rateSchool") || (locale === "vi" ? "Viết đánh giá trường" : "Rate School"))}</span>
              <PopArtChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {schoolReviews.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white border border-gray-200 space-y-3">
            <div className="w-12 h-12 bg-black text-white border border-black flex items-center justify-center mx-auto">
              <PopArtBuilding className="w-6 h-6" />
            </div>
            <h4 className="font-mono font-bold text-black text-base uppercase tracking-tight">
              {t("universityDetail.noSchoolRatingsYet") ||
                (locale === "vi" ? "Chưa có đánh giá nào cho trường này" : "No ratings yet for this school")}
            </h4>
            <div className="pt-2">
              <Link
                href={`/${locale}/universities/${university.id}/rate`}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#e03a3e] hover:bg-[#b91c1c] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors border border-[#e03a3e]"
              >
                <PopArtPencil className="w-4 h-4" />
                <span>{t("universityDetail.rateSchool") || (locale === "vi" ? "Đánh giá trường" : "Rate School")}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedReviews.map((rev) => {
              const hasUpvoted = user && rev.helpfulUserIds?.includes(user.uid);
              const c = rev.criteria;

              const reviewCriteriaList = [
                { label: t("universityDetail.critReputation") || (locale === "vi" ? "Danh tiếng" : "Reputation"), score: c?.reputation },
                { label: t("universityDetail.critLocation") || (locale === "vi" ? "Vị trí" : "Location"), score: c?.location },
                { label: t("universityDetail.critOpportunities") || (locale === "vi" ? "Cơ hội việc làm" : "Opportunities"), score: c?.opportunities },
                { label: t("universityDetail.critFacilities") || (locale === "vi" ? "Cơ sở vật chất" : "Facilities"), score: c?.facilities },
                { label: t("universityDetail.critInternet") || (locale === "vi" ? "Internet & Wifi" : "Internet"), score: c?.internet },
                { label: t("universityDetail.critFood") || (locale === "vi" ? "Căn tin & Đồ ăn" : "Food"), score: c?.food },
                { label: t("universityDetail.critClubs") || (locale === "vi" ? "Câu lạc bộ" : "Clubs"), score: c?.clubs },
                { label: t("universityDetail.critSocial") || (locale === "vi" ? "Đời sống SV" : "Social"), score: c?.social },
                { label: t("universityDetail.critHappiness") || (locale === "vi" ? "Mức độ hài lòng" : "Happiness"), score: c?.happiness },
                { label: t("universityDetail.critSafety") || (locale === "vi" ? "An ninh" : "Safety"), score: c?.safety },
              ];

              const cardAccent =
                rev.overallRating >= 4.0
                  ? "border-l-4 border-l-[#16a34a]"
                  : rev.overallRating >= 3.0
                  ? "border-l-4 border-l-[#ca8a04]"
                  : "border-l-4 border-l-[#dc2626]";

              return (
                <div
                  key={rev.id}
                  className={`bg-white border border-gray-200 p-6 space-y-4 transition-colors ${cardAccent}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Big overall rating block on the left */}
                    <div className="shrink-0 text-center">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-black mb-1">
                        Overall
                      </div>
                      <div
                        className={`w-14 h-14 flex items-center justify-center font-mono font-bold text-xl border border-gray-200 ${getScoreBgColor(
                          rev.overallRating
                        )}`}
                      >
                        {rev.overallRating.toFixed(1)}
                      </div>
                    </div>

                    {/* Review content on the right */}
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-center justify-between text-xs text-gray-500 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-black">
                            {formatReviewerName(rev.userDisplayName, locale as "vi" | "en")}
                          </span>
                          {rev.cohort && formatReviewerName(rev.userDisplayName, locale as "vi" | "en") !== rev.cohort && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-[11px] font-mono font-medium border border-gray-200">
                              {rev.cohort}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-xs">{new Date(rev.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}</span>
                      </div>

                      {/* Comment text */}
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line font-sans font-medium">
                        {rev.comment}
                      </p>

                      {/* 10 Criteria mini-bars in 2 columns */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pt-2 border-t border-gray-100">
                        {reviewCriteriaList.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-[11px] font-mono font-bold text-black truncate mr-2">
                              {item.label}
                            </span>
                            {/* 5-segment mini bars */}
                            <div className="flex gap-1 shrink-0">
                              {[1, 2, 3, 4, 5].map((seg) => {
                                const active = seg <= Math.round(item.score || 0);
                                return (
                                  <div
                                    key={seg}
                                    className={`w-3.5 h-2 border border-gray-200 ${
                                      active
                                        ? item.score && item.score >= 4
                                          ? "bg-[#6ee7b7]"
                                          : item.score && item.score >= 3
                                          ? "bg-[#fef9c3]"
                                          : "bg-[#fee2e2]"
                                        : "bg-gray-100"
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bottom action: Upvote helpful */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                        <button
                          onClick={() => handleUpvote(rev.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-xs font-mono font-bold uppercase transition-colors cursor-pointer ${
                            hasUpvoted
                              ? "bg-black text-white"
                              : "bg-white text-black hover:bg-gray-50"
                          }`}
                        >
                          <PopArtThumbsUp className="w-3.5 h-3.5" active={Boolean(hasUpvoted)} />
                          <span>{t("universityDetail.helpful", { count: rev.helpfulCount }) || `Helpful (${rev.helpfulCount})`}</span>
                        </button>

                        <button
                          onClick={() => {
                            if (!user) {
                              setIsAuthModalOpen(true);
                              return;
                            }
                            // open report action
                          }}
                          className="flex items-center gap-1 text-gray-500 hover:text-[#e03a3e] font-mono text-xs uppercase transition-colors cursor-pointer"
                          title="Report"
                        >
                          <PopArtShieldAlert className="w-3.5 h-3.5" />
                          <span>{t("universityDetail.report") || "Report"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Auth Modal if triggered */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
