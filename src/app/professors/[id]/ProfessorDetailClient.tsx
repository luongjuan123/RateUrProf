"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getProfessorById, getReviewsForProfessor, upvoteReview } from "@/lib/dataService";
import { Professor, Review } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { ReviewModal } from "@/components/ReviewModal";
import { ReportModal } from "@/components/ReportModal";
import { AuthModal } from "@/components/AuthModal";
import {
  Star,
  MessageSquare,
  ThumbsUp,
  ShieldAlert,
  Edit3,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

export default function ProfessorDetailClient({ professorId }: { professorId: string }) {
  const { user } = useAuth();
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortReviews, setSortReviews] = useState<"newest" | "highest" | "lowest" | "helpful">("newest");
  const [imageError, setImageError] = useState(false);

  // Modals
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedReviewForReport, setSelectedReviewForReport] = useState<Review | null>(null);

  const loadData = async () => {
    try {
      const prof = await getProfessorById(professorId);
      if (prof) {
        setProfessor(prof);
        const revs = await getReviewsForProfessor(professorId);
        setReviews(revs);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [professorId]);

  const handleUpvote = async (reviewId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const success = await upvoteReview(reviewId, user.uid);
    if (success) {
      setReviews((prev) =>
        prev.map((r) => {
          if (r.id === reviewId) {
            const hasVoted = r.helpfulUserIds?.includes(user.uid);
            return {
              ...r,
              helpfulCount: hasVoted ? Math.max(0, r.helpfulCount - 1) : r.helpfulCount + 1,
              helpfulUserIds: hasVoted
                ? r.helpfulUserIds.filter((id) => id !== user.uid)
                : [...(r.helpfulUserIds || []), user.uid],
            };
          }
          return r;
        })
      );
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-black border-t-transparent animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Đang tải hồ sơ giảng viên...
        </p>
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-black uppercase text-gray-900">
          Không tìm thấy hồ sơ giảng viên
        </h2>
        <p className="text-xs text-gray-500">
          Hồ sơ này không tồn tại hoặc đã được cập nhật lại mã định danh.
        </p>
        <Link
          href="/professors"
          className="inline-block px-5 py-2.5 bg-black text-white text-xs font-bold uppercase"
        >
          Trở về danh bạ
        </Link>
      </div>
    );
  }

  // Sorted reviews
  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortReviews === "newest") return b.createdAt - a.createdAt;
    if (sortReviews === "highest") return b.overallRating - a.overallRating;
    if (sortReviews === "lowest") return a.overallRating - b.overallRating;
    if (sortReviews === "helpful") return b.helpfulCount - a.helpfulCount;
    return 0;
  });

  const hasReviews = (professor.ratingCount || 0) > 0;
  const ratingStr = hasReviews && professor.ratingAverage != null ? professor.ratingAverage.toFixed(1) : null;
  const reviewCount = professor.ratingCount || 0;
  const courses = professor.courses || [];

  // Initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <Link href="/" className="hover:text-black">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/professors" className="hover:text-black">
          Giảng viên
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-bold truncate">{professor.name}</span>
      </div>

      {/* 1. LECTURER HEADER & SCORE CARD */}
      <div className="bg-white border border-gray-300 p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Avatar and Basic Info */}
          <div className="lg:col-span-8 flex flex-col sm:flex-row gap-6">
            <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 border border-gray-300 bg-gray-100 overflow-hidden flex items-center justify-center">
              {professor.avatar && !imageError ? (
                <img
                  src={professor.avatar}
                  alt={professor.name}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="text-2xl font-black text-gray-600">
                  {getInitials(professor.name)}
                </span>
              )}
            </div>

            <div className="space-y-3 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-black uppercase tracking-wider bg-black text-white">
                  {professor.universityShortName}
                </span>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  {professor.universityName}
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                  {professor.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 font-medium mt-1">
                  {professor.title || professor.academicTitle} • {professor.faculty}
                  {professor.department && ` • ${professor.department}`}
                </p>
              </div>

              {professor.bio && (
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed max-w-2xl">
                  {professor.bio}
                </p>
              )}

              {/* Courses tags */}
              {courses.length > 0 && (
                <div className="pt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Môn giảng dạy:
                  </span>
                  {courses.map((course) => (
                    <span
                      key={course}
                      className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"
                    >
                      {course}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rating Summary Box */}
          <div className="lg:col-span-4 bg-gray-50 p-6 border border-gray-300 space-y-4">
            {hasReviews ? (
              <div className="text-center pb-4 border-b border-gray-200 space-y-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Điểm số tổng quan
                </div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-black text-gray-950 tracking-tight">
                    {ratingStr}
                  </span>
                  <span className="text-base font-bold text-gray-400">/ 5.0</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-[#e03a3e]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(professor.ratingAverage ?? 0)
                          ? "fill-[#e03a3e]"
                          : "text-gray-300 fill-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 font-medium pt-1">
                  Dựa trên <span className="font-bold text-gray-900">{reviewCount}</span> lượt đánh giá
                </p>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2 border-b border-gray-200">
                <span className="inline-block px-3 py-1 bg-gray-200 text-gray-800 text-xs font-black uppercase tracking-wider">
                  Chưa có đánh giá
                </span>
                <p className="text-xs text-gray-500">
                  Hãy là sinh viên đầu tiên chia sẻ trải nghiệm về giảng viên này.
                </p>
              </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-white border border-gray-200">
                <div className="text-lg font-black text-gray-900">
                  {hasReviews && professor.takeAgainPercent !== undefined ? `${professor.takeAgainPercent}%` : "—"}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Muốn học lại
                </div>
              </div>

              <div className="p-3 bg-white border border-gray-200">
                <div className="text-lg font-black text-gray-900">
                  {hasReviews && professor.difficultyScore !== undefined ? `${professor.difficultyScore} / 5` : "—"}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Mức độ khó
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <button
              onClick={() => {
                if (!user) {
                  setIsAuthModalOpen(true);
                } else {
                  setIsReviewModalOpen(true);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#e03a3e] hover:bg-[#b91c1c] text-white text-xs font-black uppercase tracking-wider transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>Viết đánh giá cho giảng viên</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. FIVE CRITERIA BREAKDOWN & RATING DISTRIBUTION (When reviews exist) */}
      {hasReviews && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: 5 Detailed Criteria Bars */}
          <div className="lg:col-span-7 bg-white border border-gray-300 p-6 sm:p-8 space-y-6">
            <div className="border-b border-gray-200 pb-3">
              <h3 className="text-base font-extrabold uppercase tracking-tight text-gray-950 border-l-2 border-[#e03a3e] pl-2.5">
                Tiêu chí đánh giá
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Điểm trung bình theo từng tiêu chí từ phản hồi của sinh viên.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: "Chất lượng giảng dạy",
                  score: professor.criteriaAverages?.teachingQuality || 0,
                  desc: "Phương pháp giảng dạy và truyền đạt kiến thức.",
                },
                {
                  label: "Độ rõ ràng & Dễ hiểu",
                  score: professor.criteriaAverages?.clarity || 0,
                  desc: "Cấu trúc bài giảng mạch lạc, giải thích dễ hiểu.",
                },
                {
                  label: "Tính công bằng khi chấm điểm",
                  score: professor.criteriaAverages?.gradingFairness || 0,
                  desc: "Minh bạch và đánh giá đúng năng lực.",
                },
                {
                  label: "Khối lượng bài tập & Độ khó",
                  score: professor.criteriaAverages?.difficulty || 0,
                  desc: "Độ khó của đề thi và bài tập.",
                },
                {
                  label: "Khả năng tiếp cận & Hỗ trợ",
                  score: professor.criteriaAverages?.communication || 0,
                  desc: "Sẵn sàng hỗ trợ và giải đáp thắc mắc.",
                },
              ].map((crit) => (
                <div key={crit.label} className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs font-bold text-gray-900">
                    <span>{crit.label}</span>
                    <span className="font-extrabold text-[#e03a3e]">
                      {crit.score > 0 ? `${crit.score.toFixed(1)} / 5.0` : "—"}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-gray-900 transition-all duration-500"
                      style={{ width: `${(crit.score / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">{crit.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Star Rating Distribution */}
          <div className="lg:col-span-5 bg-white border border-gray-300 p-6 sm:p-8 space-y-6">
            <div className="border-b border-gray-200 pb-3">
              <h3 className="text-base font-extrabold uppercase tracking-tight text-gray-950 border-l-2 border-[#e03a3e] pl-2.5">
                Phân bố số sao
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Tỷ lệ đánh giá từ 1 đến 5 sao.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = (professor.ratingDistribution && professor.ratingDistribution[stars as 1 | 2 | 3 | 4 | 5]) || 0;
                const percent = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;

                return (
                  <div key={stars} className="flex items-center gap-3 text-xs">
                    <div className="w-12 flex items-center gap-1 font-bold text-gray-800 shrink-0">
                      <span>{stars}</span>
                      <Star className="w-3.5 h-3.5 fill-[#e03a3e] text-[#e03a3e]" />
                    </div>

                    <div className="flex-1 h-3 bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-[#e03a3e] transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <span className="w-16 text-right text-gray-500 font-semibold shrink-0">
                      {percent}% ({count})
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 text-xs text-gray-600 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Chính sách kiểm định:</span>
              </div>
              Mỗi sinh viên chỉ gửi một đánh giá duy nhất cho mỗi giảng viên để đảm bảo tính khách quan.
            </div>
          </div>
        </div>
      )}

      {/* 3. STUDENT WRITTEN REVIEWS */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-gray-950 pb-3 gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-gray-950">
              Đánh giá từ sinh viên ({reviews.length})
            </h2>
          </div>

          {/* Review Sorting Controls */}
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-gray-500 uppercase text-[10px]">Sắp xếp theo:</span>
              <select
                value={sortReviews}
                onChange={(e) => setSortReviews(e.target.value as "newest" | "highest" | "lowest" | "helpful")}
                className="p-1.5 bg-white border border-gray-300 focus:outline-none focus:border-black font-semibold text-gray-900"
              >
                <option value="newest">Mới nhất</option>
                <option value="highest">Đánh giá cao nhất</option>
                <option value="lowest">Đánh giá thấp nhất</option>
                <option value="helpful">Hữu ích nhất</option>
              </select>
            </div>
          )}
        </div>

        {sortedReviews.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 border border-gray-200 space-y-3">
            <MessageSquare className="w-10 h-10 text-gray-400 mx-auto" />
            <h4 className="font-bold text-gray-900 text-sm">Chưa có đánh giá nào</h4>
            <p className="text-xs text-gray-500">
              Hãy là sinh viên đầu tiên chia sẻ trải nghiệm về giảng viên này!
            </p>
            <button
              onClick={() => {
                if (!user) setIsAuthModalOpen(true);
                else setIsReviewModalOpen(true);
              }}
              className="px-4 py-2 bg-[#e03a3e] text-white text-xs font-bold uppercase"
            >
              Viết đánh giá đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedReviews.map((rev) => {
              const hasUpvoted = user && rev.helpfulUserIds?.includes(user.uid);

              return (
                <div
                  key={rev.id}
                  className="bg-white border border-gray-200 p-6 space-y-4 hover:border-gray-400 transition-colors"
                >
                  {/* Top Bar of Review */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-black text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {rev.userDisplayName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-gray-900">
                          {rev.userDisplayName}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2">
                          <span className="font-medium text-gray-700">
                            Môn: {rev.courseName}
                          </span>
                          <span>•</span>
                          <span>{new Date(rev.createdAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-black text-white text-xs font-black">
                        <Star className="w-3.5 h-3.5 fill-[#e03a3e] text-[#e03a3e]" />
                        <span>{rev.overallRating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges / Course Meta */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {rev.gradeReceived && (
                      <span className="px-2 py-0.5 bg-gray-100 font-bold text-gray-800 border border-gray-200">
                        Điểm: {rev.gradeReceived}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200">
                      {rev.attendanceMandatory ? "Điểm danh: Bắt buộc" : "Điểm danh: Tự do"}
                    </span>
                    <span className={`px-2 py-0.5 border ${
                      rev.takeAgain
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}>
                      {rev.takeAgain ? "Muốn học lại: Có" : "Muốn học lại: Không"}
                    </span>
                  </div>

                  {/* Comment Body */}
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                    {rev.comment}
                  </p>

                  {/* Tags */}
                  {rev.tags && rev.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {rev.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-50 text-gray-600 border border-gray-200 text-xs font-medium"
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 transition-all ${
                        hasUpvoted
                          ? "bg-red-50 text-[#e03a3e] font-bold border border-red-200"
                          : "text-gray-600 hover:text-black hover:bg-gray-100"
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? "fill-[#e03a3e]" : ""}`} />
                      <span>Hữu ích ({rev.helpfulCount})</span>
                    </button>

                    <button
                      onClick={() => handleOpenReport(rev)}
                      className="flex items-center gap-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Báo cáo bình luận vi phạm"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Báo cáo</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        professor={professor}
        onReviewSubmitted={loadData}
      />

      {/* Report Modal */}
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
