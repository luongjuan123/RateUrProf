"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { reportReview } from "@/lib/dataService";
import { Review } from "@/types";
import { useTranslation } from "@/locales/i18n";
import { ShieldAlert, X, Check } from "lucide-react";

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
      <div className="relative w-full max-w-md bg-white border-2 border-gray-900 overflow-hidden">
        {/* Red accent line */}
        <div className="h-1 bg-[#e03a3e] w-full" />

        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#e03a3e]" />
            <h3 className="font-extrabold text-base text-gray-900 tracking-tight">
              {t("reportModal.title")}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h4 className="font-bold text-gray-900 text-base">{t("reportModal.successTitle")}</h4>
            <p className="text-xs text-gray-600">
              {t("reportModal.successDesc")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs border border-red-200">
                {error}
              </div>
            )}

            <div className="p-3 bg-gray-50 border border-gray-200 text-xs text-gray-600 italic">
              “{review.comment.slice(0, 120)}...”
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">
                {t("reportModal.reasonLabel")}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 text-xs border border-gray-300 focus:outline-none focus:border-black bg-white"
              >
                {reasons.map((r) => (
                  <option key={r.key} value={r.label}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">
                {t("reportModal.detailsLabel")}
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t("reportModal.detailsPlaceholder")}
                className="w-full p-2.5 text-xs border border-gray-300 focus:outline-none focus:border-black"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-black uppercase"
              >
                {t("reportModal.cancel")}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#e03a3e] hover:bg-[#b91c1c] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
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
