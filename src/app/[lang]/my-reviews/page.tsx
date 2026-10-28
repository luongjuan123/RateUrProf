"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getUserReviews, deleteReview } from "@/lib/dataService";
import { Review } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { useTranslation } from "@/locales/i18n";
import { formatDate, formatRating } from "@/lib/formatters";
import {
  PopArtMessageSquare,
  PopArtExternalLink,
  PopArtThumbsUp,
  PopArtPencil,
  PopArtTrash,
} from "@/components/icons/PopArtIcons";
import { getRatingLevel, getDifficultyLevelByValue } from "@/lib/ratingLevels";
import { AlertModal } from "@/components/AlertModal";

export default function LocalizedMyReviewsPage() {
  const { locale, t } = useTranslation();
  const { user, userProfile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ reviewId: string; profId: string } | null>(null);

  const loadUserReviews = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const revs = await getUserReviews(user.uid);
      setReviews(revs);
    } catch (err) {
      console.error("Error loading user reviews:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let ignore = false;
    const fetchRevs = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const revs = await getUserReviews(user.uid);
        if (!ignore) {
          setReviews(revs);
        }
      } catch (err) {
        console.error("Error loading user reviews:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    fetchRevs();
    return () => {
      ignore = true;
    };
  }, [user]);

  const handleDelete = (reviewId: string, profId: string) => {
    setDeleteTarget({ reviewId, profId });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { reviewId, profId } = deleteTarget;
    setDeletingId(reviewId);
    try {
      const ok = await deleteReview(reviewId, profId);
      if (ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-5 bg-white border border-gray-200 my-10 p-8">
        <div className="w-14 h-14 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center mx-auto">
          <PopArtMessageSquare className="w-6 h-6 text-[#1d4ed8]" />
        </div>
        <h1 className="text-2xl font-mono font-bold uppercase tracking-tight text-black">
          {t("myReviews.loginPromptTitle")}
        </h1>
        <p className="text-xs font-mono text-gray-700 max-w-md mx-auto leading-relaxed">
          {t("myReviews.loginPromptDesc")}
        </p>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
        >
          {t("myReviews.loginBtn")}
        </button>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <span className="inline-block px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-widest bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] mb-2">
          {t("myReviews.studentAccount")}
        </span>
        <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-black mt-1">
          {t("myReviews.title")}
        </h1>
        <p className="text-xs font-mono text-gray-700 mt-2">
          {t("myReviews.viewingAs")}{" "}
          <span className="font-bold text-[#1d4ed8] bg-[#eff6ff] px-1.5 py-0.5 border border-[#bfdbfe]">
            {userProfile?.displayName || user.email || t("myReviews.anonymousStudent")}
          </span>
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs font-mono font-bold text-gray-500">
          {t("myReviews.loading")}
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-200 space-y-3">
          <div className="w-12 h-12 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center mx-auto mb-2">
            <PopArtMessageSquare className="w-6 h-6 text-[#1d4ed8]" />
          </div>
          <h3 className="font-mono font-bold text-base text-black uppercase">
            {t("myReviews.noReviews")}
          </h3>
          <p className="text-xs font-mono text-gray-600 max-w-sm mx-auto">
            {t("myReviews.noReviewsDesc")}
          </p>
          <Link
            href={`/${locale}`}
            className="inline-block px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-mono font-bold uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
          >
            {t("myReviews.findProfBtn")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-gray-200 border-l-4 border-l-[#1d4ed8] transition-colors p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
                <div>
                  <Link
                    href={`/${locale}/professors/${rev.professorId}`}
                    className="text-base font-bold text-black hover:text-[#1d4ed8] transition-colors flex items-center gap-1.5"
                  >
                    <span>{rev.professorName}</span>
                    <PopArtExternalLink className="w-3.5 h-3.5 text-[#1d4ed8]" />
                  </Link>
                  <p className="text-xs font-mono text-gray-600 mt-1">
                    {t("myReviews.courseLabel")}{" "}
                    <span className="font-bold text-black">{rev.courseName}</span>{" "}
                    • {t("myReviews.submittedOn")} {formatDate(rev.createdAt, locale)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {(() => {
                    const level = getRatingLevel(rev.overallRating);
                    const diffVal = rev.criteria?.difficulty ?? 3;
                    const diffLevel = getDifficultyLevelByValue(diffVal);
                    return (
                      <>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#eff6ff] text-[#1d4ed8] text-xs font-mono font-bold border border-[#bfdbfe]">
                          <span className="text-[10px] uppercase tracking-wider">
                            {locale === "vi" ? level.labelVi : level.labelEn}
                          </span>
                          <span>•</span>
                          <span>{formatRating(rev.overallRating, locale)}</span>
                        </div>

                        <div
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-mono font-bold border border-slate-200"
                          title={`${locale === "vi" ? "Độ khó" : "Difficulty"}: ${diffVal}/5 (${locale === "vi" ? diffLevel.labelVi : diffLevel.labelEn})`}
                        >
                          <span className="text-[10px] uppercase tracking-wider">
                            {locale === "vi" ? "ĐỘ KHÓ" : "DIFF"}
                          </span>
                          <span>•</span>
                          <span>{diffVal.toFixed(1)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Badges / Course Meta */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                {(() => {
                  const diffVal = rev.criteria?.difficulty ?? 3;
                  const diffLevel = getDifficultyLevelByValue(diffVal);
                  return (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 font-bold">
                      {locale === "vi" ? "Độ khó:" : "Difficulty:"}{" "}
                      <span className="font-bold text-black">{diffVal}/5</span>{" "}
                      <span className="text-[11px] font-medium opacity-80">({locale === "vi" ? diffLevel.labelVi : diffLevel.labelEn})</span>
                    </span>
                  );
                })()}
                {rev.gradeReceived && (
                  <span className="px-2 py-0.5 bg-[#eff6ff] text-[#1d4ed8] font-bold border border-[#bfdbfe]">
                    {t("professorDetail.grade") || (locale === "vi" ? "Điểm:" : "Grade:")} {rev.gradeReceived}
                  </span>
                )}
                <span className="px-2 py-0.5 bg-white text-slate-700 font-medium border border-gray-200">
                  {rev.attendanceMandatory
                    ? t("professorDetail.attendanceMandatory") || (locale === "vi" ? "Điểm danh: Bắt buộc" : "Attendance: Mandatory")
                    : t("professorDetail.attendanceOptional") || (locale === "vi" ? "Điểm danh: Tự do" : "Attendance: Optional")}
                </span>
                <span className={`px-2 py-0.5 border font-bold ${
                  rev.takeAgain ? "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]" : "bg-slate-100 text-slate-700 border-slate-200"
                }`}>
                  {rev.takeAgain
                    ? t("professorDetail.takeAgainYes") || (locale === "vi" ? "Muốn học lại: Có" : "Take Again: Yes")
                    : t("professorDetail.takeAgainNo") || (locale === "vi" ? "Muốn học lại: Không" : "Take Again: No")}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-gray-900 leading-relaxed font-sans font-medium">
                {rev.comment}
              </p>

              {rev.tags && rev.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rev.tags.map((tg) => (
                    <span
                      key={tg}
                      className="px-2 py-0.5 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] text-xs font-mono font-bold"
                    >
                      #{tg}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-3 text-gray-700">
                  <span className="flex items-center gap-1">
                    <PopArtThumbsUp className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    {t("myReviews.helpfulCount", { count: rev.helpfulCount })}
                  </span>
                  <span>•</span>
                  <span className="font-bold text-[#1d4ed8] bg-[#eff6ff] px-2 py-0.5 border border-[#bfdbfe]">
                    {t("myReviews.statusLabel")}{" "}
                    {rev.status === "published" ? t("myReviews.publishedStatus") : rev.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/${locale}/professors/${rev.professorId}/rate`}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe] text-xs font-mono font-bold transition-colors"
                  >
                    <PopArtPencil className="w-3.5 h-3.5" />
                    <span>{locale === "vi" ? "Sửa đánh giá" : "Edit Rating"}</span>
                  </Link>

                  <button
                    onClick={() => handleDelete(rev.id, rev.professorId)}
                    disabled={deletingId === rev.id}
                    className="flex items-center gap-1 text-slate-700 bg-white hover:bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-mono font-bold transition-colors cursor-pointer"
                  >
                    <PopArtTrash className="w-3.5 h-3.5" />
                    <span>{t("myReviews.deleteBtn")}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Neo-Brutalist Delete Confirmation Modal */}
      <AlertModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        badge={locale === "vi" ? "Xác nhận hành động" : "Confirm Action"}
        title={locale === "vi" ? "Xóa đánh giá này?" : "Delete This Review?"}
        message={t("myReviews.deleteConfirm")}
        type="danger"
        confirmText={locale === "vi" ? "Xóa vĩnh viễn" : "Delete Permanently"}
        cancelText={locale === "vi" ? "Hủy bỏ" : "Cancel"}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
