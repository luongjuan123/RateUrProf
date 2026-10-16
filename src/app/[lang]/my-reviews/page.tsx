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
  Star,
  Trash2,
  ThumbsUp,
  MessageSquare,
  ExternalLink
} from "lucide-react";

export default function LocalizedMyReviewsPage() {
  const { locale, t } = useTranslation();
  const { user, userProfile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async (reviewId: string, profId: string) => {
    if (!confirm(t("myReviews.deleteConfirm"))) {
      return;
    }
    setDeletingId(reviewId);
    try {
      const ok = await deleteReview(reviewId, profId);
      if (ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-14 h-14 bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto text-gray-500">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-gray-950">
          {t("myReviews.loginPromptTitle")}
        </h1>
        <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
          {t("myReviews.loginPromptDesc")}
        </p>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="px-6 py-2.5 bg-[#e03a3e] hover:bg-[#b91c1c] text-white font-bold text-xs uppercase tracking-wider transition-colors"
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
      {/* Editorial Header */}
      <div className="border-b-2 border-gray-900 pb-4">
        <span className="text-[11px] font-black uppercase tracking-widest text-[#e03a3e]">
          {t("myReviews.studentAccount")}
        </span>
        <h1 className="text-3xl font-black uppercase tracking-tight text-gray-950 mt-1">
          {t("myReviews.title")}
        </h1>
        <p className="text-xs text-gray-600 mt-1">
          {t("myReviews.viewingAs")}{" "}
          <span className="font-bold text-gray-900">
            {userProfile?.displayName || user.email || t("myReviews.anonymousStudent")}
          </span>
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-gray-500">
          {t("myReviews.loading")}
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 text-center bg-gray-50 border border-gray-200 space-y-3">
          <MessageSquare className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="font-extrabold text-base text-gray-900">
            {t("myReviews.noReviews")}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {t("myReviews.noReviewsDesc")}
          </p>
          <Link
            href={`/${locale}/professors`}
            className="inline-block px-5 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            {t("myReviews.findProfBtn")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-gray-200 p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <Link
                    href={`/${locale}/professors/${rev.professorId}`}
                    className="text-base font-extrabold text-gray-900 hover:text-[#e03a3e] transition-colors flex items-center gap-1.5"
                  >
                    <span>{rev.professorName}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t("myReviews.courseLabel")}{" "}
                    <span className="font-semibold text-gray-800">{rev.courseName}</span>{" "}
                    • {t("myReviews.submittedOn")} {formatDate(rev.createdAt, locale)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-3 py-1 bg-black text-white text-sm font-black">
                    <Star className="w-3.5 h-3.5 fill-[#e03a3e] text-[#e03a3e]" />
                    <span>{formatRating(rev.overallRating, locale)}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-sans">
                {rev.comment}
              </p>

              {rev.tags && rev.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rev.tags.map((tg) => (
                    <span
                      key={tg}
                      className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 text-xs"
                    >
                      #{tg}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-gray-500">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {t("myReviews.helpfulCount", { count: rev.helpfulCount })}
                  </span>
                  <span>•</span>
                  <span className="capitalize text-emerald-700 font-semibold">
                    {t("myReviews.statusLabel")}{" "}
                    {rev.status === "published" ? t("myReviews.publishedStatus") : rev.status}
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(rev.id, rev.professorId)}
                  disabled={deletingId === rev.id}
                  className="flex items-center gap-1 text-red-600 hover:text-red-800 font-semibold p-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t("myReviews.deleteBtn")}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
