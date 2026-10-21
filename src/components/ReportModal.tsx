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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border-3 border-black shadow-[8px_8px_0px_#000] rounded-none overflow-hidden">
        {/* Editorial red top stripe */}
        <div className="h-2 bg-[#e03a3e] w-full border-b-2 border-black" />

        <div className="p-5 border-b-2 border-black flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <PopArtShieldAlert className="w-5 h-5" />
            <h3 className="font-mono font-black text-base uppercase text-black tracking-wider">
              {t("reportModal.title")}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-1 border-2 border-black bg-white text-black shadow-[2px_2px_0px_#000] hover:bg-[#fee2e2] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <PopArtX className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-4 bg-white">
            <div className="w-12 h-12 bg-[#6ee7b7] text-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center mx-auto">
              <PopArtCheck className="w-7 h-7" />
            </div>
            <h4 className="font-mono font-black text-black text-base uppercase tracking-tight">{t("reportModal.successTitle")}</h4>
            <p className="font-mono text-xs text-gray-700">
              {t("reportModal.successDesc")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-white">
            {error && (
              <div className="p-3 bg-[#fee2e2] text-black font-mono text-xs border-2 border-black shadow-[2px_2px_0px_#000]">
                {error}
              </div>
            )}

            <div className="p-3 bg-[#fef9c3]/50 border-2 border-black shadow-[2px_2px_0px_#000] font-mono text-xs text-black italic">
              “{review.comment.slice(0, 120)}...”
            </div>

            <div>
              <label className="block text-xs font-mono font-black text-black uppercase tracking-wider mb-1.5">
                {t("reportModal.reasonLabel")}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 text-xs font-mono font-bold border-2 border-black shadow-[2px_2px_0px_#000] outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:bg-[#fef9c3]/30 bg-white text-black rounded-none"
              >
                {reasons.map((r) => (
                  <option key={r.key} value={r.label}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-black text-black uppercase tracking-wider mb-1.5">
                {t("reportModal.detailsLabel")}
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t("reportModal.detailsPlaceholder")}
                className="w-full p-2.5 text-xs font-mono border-2 border-black shadow-[2px_2px_0px_#000] outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:bg-[#fef9c3]/30 bg-white text-black rounded-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-black">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono font-black text-black uppercase border-2 border-black shadow-[2px_2px_0px_#000] bg-white hover:bg-black/5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer rounded-none"
              >
                {t("reportModal.cancel")}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#e03a3e] hover:bg-black text-white font-mono font-black text-xs uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 cursor-pointer rounded-none"
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
