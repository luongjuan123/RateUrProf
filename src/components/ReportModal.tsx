"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { reportReview } from "@/lib/dataService";
import { Review } from "@/types";
import { useTranslation } from "@/locales/i18n";
import { PopArtShieldAlert, PopArtX, PopArtCheck } from "@/components/icons/PopArtIcons";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  review,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const reasons = [
    { key: "reasonOffensive", label: t("reportModal.reasonOffensive") },
    { key: "reasonDoxxing", label: t("reportModal.reasonDoxxing") },
    { key: "reasonDefamation", label: t("reportModal.reasonDefamation") },
    { key: "reasonSpam", label: t("reportModal.reasonSpam") },
    { key: "reasonOther", label: t("reportModal.reasonOther") },
  ];

  const [reason, setReason] = useState(reasons[0].label);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError(t("reportModal.errorLogin"));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const ok = await reportReview({
        reviewId: review.id,
        professorId: review.professorId,
        professorName: review.professorName,
        reviewCommentSnippet: review.comment.slice(0, 150),
        reportedByUserId: user.uid,
        reason,
        details: details.trim() || undefined,
      });

      if (ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(t("common.error"));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border border-gray-200 overflow-hidden">
        {/* Editorial red top stripe */}
        <div className="h-1 bg-[#e03a3e] w-full" />

        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <PopArtShieldAlert className="w-5 h-5" />
            <h3 className="font-mono font-bold text-base uppercase text-black tracking-wider">
              {t("reportModal.title")}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-1 border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <PopArtX className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-4 bg-white">
            <div className="w-12 h-12 bg-[#dcfce7] text-[#166534] border border-green-200 flex items-center justify-center mx-auto">
              <PopArtCheck className="w-7 h-7" />
            </div>
            <h4 className="font-mono font-bold text-black text-base uppercase tracking-tight">{t("reportModal.successTitle")}</h4>
            <p className="font-mono text-xs text-gray-700">
              {t("reportModal.successDesc")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-white">
            {error && (
              <div className="p-3 bg-[#fee2e2] text-black font-mono text-xs border border-red-200">
                {error}
              </div>
            )}

            <div className="p-3 bg-gray-50 border border-gray-200 font-mono text-xs text-gray-700 italic">
              “{review.comment.slice(0, 120)}...”
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-black uppercase tracking-wider mb-1.5">
                {t("reportModal.reasonLabel")}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 text-xs font-mono font-bold border border-gray-200 outline-none focus:outline-none focus:border-black bg-white text-black"
              >
                {reasons.map((r) => (
                  <option key={r.key} value={r.label}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-black uppercase tracking-wider mb-1.5">
                {t("reportModal.detailsLabel")}
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t("reportModal.detailsPlaceholder")}
                className="w-full p-2.5 text-xs font-mono border border-gray-200 outline-none focus:outline-none focus:border-black bg-white text-black"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono font-bold text-black uppercase border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {t("reportModal.cancel")}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#e03a3e] hover:bg-[#b91c1c] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#e03a3e] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? t("reportModal.submitting") : t("reportModal.submit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
