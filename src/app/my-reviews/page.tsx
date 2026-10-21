"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getUserReviews, deleteReview } from "@/lib/dataService";
import { Review } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import {
  PopArtExternalLink,
  PopArtThumbsUp,
  PopArtPencil,
  PopArtTrash,
  PopArtMessageSquare,
} from "@/components/icons/PopArtIcons";
import { getRatingLevel, getDifficultyLevelByValue } from "@/lib/ratingLevels";
import { AlertModal } from "@/components/AlertModal";

export default function MyReviewsPage() {
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
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-5 bg-white border-2 border-black shadow-[6px_6px_0px_#000] my-10 p-8">
        <div className="w-14 h-14 bg-[#fef9c3] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center mx-auto text-black">
          <PopArtMessageSquare className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-mono font-black uppercase tracking-tight text-black">
          Quản lý Đánh giá của bạn
        </h1>
        <p className="text-xs font-mono text-gray-700 max-w-md mx-auto leading-relaxed">
          Vui lòng đăng nhập để xem danh sách các đánh giá bạn đã đóng góp, chỉnh sửa hoặc quản lý lịch sử nhận xét.
        </p>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="px-6 py-2.5 bg-[#e03a3e] hover:bg-[#c93236] text-white font-mono font-black text-xs uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-[5px_5px_0px_#000] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
        >
          Đăng nhập ngay
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
      {/* Editorial Header */}
      <div className="border-b-2 border-black pb-4">
        <span className="inline-block px-2.5 py-1 text-[11px] font-mono font-black uppercase tracking-widest bg-[#fef9c3] text-black border-2 border-black shadow-[2px_2px_0px_#000] mb-2">
          Tài khoản sinh viên
        </span>
        <h1 className="text-3xl font-mono font-black uppercase tracking-tight text-black mt-1">
          Lịch sử Đánh giá của tôi
        </h1>
        <p className="text-xs font-mono text-gray-700 mt-2">
          Đang xem với tư cách: <span className="font-bold text-black bg-[#e0f2fe] px-1.5 py-0.5 border border-black">{userProfile?.displayName || user.email || "Sinh viên ẩn danh"}</span>
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs font-mono font-bold text-gray-500">
          Đang tải danh sách đánh giá...
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 text-center bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-3">
          <PopArtMessageSquare className="w-10 h-10 mx-auto" />
          <h3 className="font-mono font-black text-base text-black uppercase">
            Bạn chưa gửi đánh giá nào
          </h3>
          <p className="text-xs font-mono text-gray-600 max-w-sm mx-auto">
            Hãy tìm kiếm giảng viên bạn đã từng học và chia sẻ những kinh nghiệm quý báu cho các bạn sinh viên khác.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-black text-[#fef9c3] text-xs font-mono font-bold uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Tìm giảng viên để đánh giá
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] transition-all p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
                <div>
                  <Link
                    href={`/professors/${rev.professorId}`}
                    className="text-base font-black text-black hover:text-[#e03a3e] transition-colors flex items-center gap-1.5"
                  >
                    <span>{rev.professorName}</span>
                    <PopArtExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <p className="text-xs font-mono text-gray-600 mt-1">
                    Môn: <span className="font-bold text-black">{rev.courseName}</span> • Ngày gửi: {new Date(rev.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {(() => {
                    const level = getRatingLevel(rev.overallRating);
                    const diffVal = rev.criteria?.difficulty ?? 3;
                    const diffLevel = getDifficultyLevelByValue(diffVal);
                    return (
                      <>
                        <div
                          className="flex items-center gap-1.5 px-3 py-1 text-black text-xs font-mono font-black border-2 border-black shadow-[2px_2px_0px_#000]"
                          style={{ backgroundColor: level.color }}
                        >
                          <span className="text-[10px] uppercase tracking-wider">
                            {level.labelVi}
                          </span>
                          <span>•</span>
                          <span>{rev.overallRating.toFixed(1)}</span>
                        </div>

                        <div
                          className="flex items-center gap-1 px-2.5 py-1 text-black text-xs font-mono font-black border-2 border-black shadow-[2px_2px_0px_#000]"
                          style={{ backgroundColor: diffLevel.color }}
                          title={`Độ khó: ${diffVal}/5 (${diffLevel.labelVi})`}
                        >
                          <span className="text-[10px] uppercase tracking-wider">
                            ĐỘ KHÓ
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
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {(() => {
                  const diffVal = rev.criteria?.difficulty ?? 3;
                  const diffLevel = getDifficultyLevelByValue(diffVal);
                  return (
                    <span
                      className="px-2 py-0.5 border border-black shadow-[1px_1px_0px_#000] font-bold"
                      style={{ backgroundColor: diffLevel.lightBg, color: diffLevel.textColor }}
                    >
                      Độ khó: <span className="font-black text-black">{diffVal}/5</span>{" "}
                      <span className="text-[11px] font-bold opacity-90">({diffLevel.labelVi})</span>
                    </span>
                  );
                })()}
                {rev.gradeReceived && (
                  <span className="px-2 py-0.5 bg-[#fef9c3] font-black text-black border border-black shadow-[1px_1px_0px_#000]">
                    Điểm: {rev.gradeReceived}
                  </span>
                )}
                <span className="px-2 py-0.5 bg-white text-black font-bold border border-black shadow-[1px_1px_0px_#000]">
                  {rev.attendanceMandatory ? "Điểm danh: Bắt buộc" : "Điểm danh: Tự do"}
                </span>
                <span className={`px-2 py-0.5 border border-black shadow-[1px_1px_0px_#000] font-bold ${
                  rev.takeAgain ? "bg-[#6ee7b7] text-black" : "bg-[#fee2e2] text-black"
                }`}>
                  {rev.takeAgain ? "Muốn học lại: Có" : "Muốn học lại: Không"}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-gray-900 leading-relaxed font-sans">
                {rev.comment}
              </p>

              {rev.tags && rev.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rev.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-[#fef9c3] text-black border border-black shadow-[1px_1px_0px_#000] text-xs font-mono font-bold"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t-2 border-black flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-3 text-gray-700">
                  <span className="flex items-center gap-1">
                    <PopArtThumbsUp className="w-3.5 h-3.5" />
                    {rev.helpfulCount} lượt thấy hữu ích
                  </span>
                  <span>•</span>
                  <span className="font-bold text-black bg-[#6ee7b7]/40 px-2 py-0.5 border border-black">
                    {rev.status === "published" ? "Đã công bố" : rev.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/professors/${rev.professorId}/rate`}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#fef9c3] hover:bg-[#fde047] text-black border border-black text-xs font-mono font-bold shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                  >
                    <PopArtPencil className="w-3.5 h-3.5" />
                    <span>Sửa đánh giá</span>
                  </Link>

                  <button
                    onClick={() => handleDelete(rev.id, rev.professorId)}
                    disabled={deletingId === rev.id}
                    className="flex items-center gap-1 text-black bg-[#fee2e2] hover:bg-red-200 border border-black px-2.5 py-1 text-xs font-mono font-bold shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  >
                    <PopArtTrash className="w-3.5 h-3.5" />
                    <span>Xóa đánh giá</span>
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
        badge="Xác nhận hành động"
        title="Xóa đánh giá này?"
        message="Bạn có chắc chắn muốn xóa vĩnh viễn đánh giá này không? Điểm số đánh giá của giảng viên sẽ được tự động tính toán lại."
        type="danger"
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy bỏ"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
