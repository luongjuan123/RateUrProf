"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUniversityById, submitSchoolReview, getUserReviewForSchool, updateSchoolReview, deleteSchoolReview } from "@/lib/dataService";
import { University, SchoolCriteriaRatings } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/locales/i18n";
import { AuthModal } from "@/components/AuthModal";
import { getRatingLevelByValue, RATING_LEVELS } from "@/lib/ratingLevels";
import { isAnonymousName, resolveReviewerDisplayName } from "@/lib/formatters";
import {
  PopArtArrowLeft,
  PopArtCheck,
  PopArtAlertCircle,
  PopArtInfo,
  PopArtChevronDown,
  PopArtChevronUp,
  PopArtTrash,
  PopArtLock,
} from "@/components/icons/PopArtIcons";

export default function RateSchoolClient({ universityId }: { universityId: string }) {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { locale, t } = useTranslation();

  const [university, setUniversity] = useState<University | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Edit Mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 10 Criteria ratings (1-5)
  const [criteria, setCriteria] = useState<Partial<SchoolCriteriaRatings>>({
    reputation: undefined,
    location: undefined,
    opportunities: undefined,
    facilities: undefined,
    internet: undefined,
    food: undefined,
    clubs: undefined,
    social: undefined,
    happiness: undefined,
    safety: undefined,
  });
  const [hoveredCriteria, setHoveredCriteria] = useState<{ [key: string]: number | null }>({});

  const [reviewComment, setReviewComment] = useState("");
  const [cohortName, setCohortName] = useState(userProfile?.cohort || "");

  // UI state
  const [guidelinesOpen, setGuidelinesOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const uni = await getUniversityById(universityId);
        if (isMounted) setUniversity(uni);

        if (user?.uid) {
          const existing = await getUserReviewForSchool(universityId, user.uid);
          if (existing && isMounted) {
            setIsEditMode(true);
            setExistingReviewId(existing.id);
            setCriteria(existing.criteria);
            setReviewComment(existing.comment || "");
            if (existing.cohort) setCohortName(existing.cohort);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [universityId, user?.uid]);

  const handleCriterionChange = (key: keyof SchoolCriteriaRatings, val: number) => {
    setCriteria((prev) => ({ ...prev, [key]: val }));
  };

  const criteriaList: {
    key: keyof SchoolCriteriaRatings;
    label: string;
  }[] = [
    { key: "reputation", label: t("rateSchoolPage.reputation") || "Reputation *" },
    { key: "location", label: t("rateSchoolPage.location") || "Location *" },
    { key: "opportunities", label: t("rateSchoolPage.opportunities") || "Opportunities *" },
    { key: "facilities", label: t("rateSchoolPage.facilities") || "Facilities and common areas *" },
    { key: "internet", label: t("rateSchoolPage.internet") || "Internet *" },
    { key: "food", label: t("rateSchoolPage.food") || "Food *" },
    { key: "clubs", label: t("rateSchoolPage.clubs") || "Clubs *" },
    { key: "social", label: t("rateSchoolPage.social") || "Social *" },
    { key: "happiness", label: t("rateSchoolPage.happiness") || "Happiness *" },
    { key: "safety", label: t("rateSchoolPage.safety") || "Safety *" },
  ];

  const handleDelete = async () => {
    if (!existingReviewId) return;
    try {
      setIsDeleting(true);
      const ok = await deleteSchoolReview(existingReviewId);
      if (ok) {
        router.push(`/${locale}/universities/${universityId}`);
      } else {
        setError(locale === "vi" ? "Không thể xóa đánh giá trường." : "Failed to delete school rating.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error deleting school rating");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    for (const item of criteriaList) {
      if (criteria[item.key] === undefined || criteria[item.key] === null) {
        setError(
          locale === "vi"
            ? `Vui lòng đánh giá mục: ${item.label.replace("*", "").trim()}`
            : `Please rate the category: ${item.label.replace("*", "").trim()}`
        );
        return;
      }
    }

    if (reviewComment.trim().length < 25) {
      setError(
        locale === "vi"
          ? "Đánh giá chi tiết cần có ít nhất 25 ký tự để cung cấp thông tin hữu ích."
          : "Your review must be at least 25 characters to provide meaningful feedback."
      );
      return;
    }

    if (cohortName.trim() && isAnonymousName(cohortName.trim())) {
      setError(
        t("rateSchoolPage.errorAnonymous") ||
          (locale === "vi"
            ? "Không được sử dụng tên ẩn danh khi gửi đánh giá."
            : "Cannot use an anonymous name when posting a review.")
      );
      return;
    }

    try {
      setSubmitting(true);
      const studentName = resolveReviewerDisplayName(cohortName, user, userProfile);

      let res;
      if (isEditMode && existingReviewId) {
        res = await updateSchoolReview(existingReviewId, {
          userId: user.uid,
          userDisplayName: studentName,
          cohort: cohortName.trim() || undefined,
          criteria: criteria as SchoolCriteriaRatings,
          comment: reviewComment.trim(),
        });
      } else {
        res = await submitSchoolReview({
          universityId,
          userId: user.uid,
          userDisplayName: studentName,
          cohort: cohortName.trim() || undefined,
          criteria: criteria as SchoolCriteriaRatings,
          comment: reviewComment.trim(),
        });
      }

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/${locale}/universities/${universityId}`);
        }, 1800);
      } else {
        setError(res.error || t("common.error") || "An error occurred.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error submitting review");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-black border-t-transparent animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          {locale === "vi" ? "Đang tải biểu mẫu..." : "Loading rating form..."}
        </p>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-black text-gray-900">
          {locale === "vi" ? "Không tìm thấy trường đại học" : "University Not Found"}
        </h2>
        <Link
          href={`/${locale}`}
          className="inline-block px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold uppercase transition-colors border border-[#1d4ed8]"
        >
          {locale === "vi" ? "Trở về trang chủ" : "Back to Home"}
        </Link>
      </div>
    );
  }

  const locationText = [university.city, university.region].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-white py-8 sm:py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Back Link */}
        <Link
          href={`/${locale}/universities/${universityId}`}
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-black hover:text-[#1d4ed8] uppercase tracking-wider transition-colors"
        >
          <PopArtArrowLeft className="w-4 h-4" />
          <span>{t("rateSchoolPage.backToSchool") || (locale === "vi" ? "Trở về trang trường" : "Back to School")}</span>
        </Link>

        {/* Header Title Section */}
        <div className="border-b border-gray-200 pb-4">
          {locationText && (
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500">
              {locationText}
            </p>
          )}
          <h1 className="text-3xl sm:text-4xl font-mono font-black text-black tracking-tight mt-1">
            {university.name}
          </h1>
          <h2 className="text-xl sm:text-2xl font-mono font-bold text-black mt-1 uppercase">
            {t("rateSchoolPage.pageTitle") || "Add Rating"}
          </h2>
        </div>

        {/* Success Banner */}
        {success ? (
          <div className="bg-white border border-gray-200 p-8 sm:p-10 text-center space-y-4">
            <div className="w-14 h-14 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center mx-auto">
              <PopArtCheck className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-mono font-bold text-black uppercase">
              {t("rateSchoolPage.successTitle") || (locale === "vi" ? "Cảm ơn bạn đã đánh giá!" : "Thank you for rating!")}
            </h3>
            <p className="text-sm font-mono text-gray-700 max-w-md mx-auto">
              {t("rateSchoolPage.successDesc") ||
                (locale === "vi"
                  ? "Đánh giá của bạn đã được ghi nhận và đang chuyển hướng về trang trường..."
                  : "Your school rating has been submitted successfully. Redirecting back to profile...")}
            </p>
            <Link
              href={`/${locale}/universities/${universityId}`}
              className="inline-block mt-4 px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-mono font-bold uppercase tracking-wider border border-[#1d4ed8] transition-colors"
            >
              {t("rateSchoolPage.backToProfile") || (locale === "vi" ? "Quay lại hồ sơ ngay" : "Return to Profile")}
            </Link>
          </div>
        ) : !user ? (
          <div className="bg-white p-8 border border-gray-200 text-center space-y-6">
            <div className="w-16 h-16 bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center mx-auto text-[#1d4ed8]">
              <PopArtLock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-gray-100 border border-gray-200 font-mono font-bold text-[11px] uppercase tracking-wider">
                {locale === "vi" ? "Yêu cầu đăng nhập" : "Sign In Required"}
              </span>
              <h2 className="text-2xl font-mono font-black uppercase text-black">
                {locale === "vi" ? "Đăng nhập để đánh giá trường" : "Sign In to Rate University"}
              </h2>
              <p className="text-xs font-mono text-gray-700 max-w-md mx-auto leading-relaxed">
                {t("rateSchoolPage.signInToRate") ||
                  (locale === "vi"
                    ? "Vui lòng đăng nhập để đánh giá trường. Mỗi sinh viên chỉ đánh giá 1 lần và có thể chỉnh sửa hoặc xóa bất cứ lúc nào."
                    : "Please sign in to rate this university. Each student can rate once and make changes anytime.")}
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
              >
                {t("rateSchoolPage.signInButton") || (locale === "vi" ? "Đăng nhập để đánh giá" : "Sign In to Rate")}
              </button>
              <Link
                href={`/${locale}/universities/${universityId}`}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 bg-white hover:bg-gray-50 text-black font-mono font-bold text-xs uppercase tracking-wider border border-gray-200 transition-colors cursor-pointer"
              >
                {t("rateSchoolPage.backToSchool") || (locale === "vi" ? "Trở về trang trường" : "Back to University")}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Edit Mode Alert Banner */}
            {isEditMode && (
              <div className="p-4 bg-[#eff6ff] border border-[#bfdbfe] flex items-start gap-3">
                <PopArtInfo className="w-5 h-5 shrink-0 mt-0.5 text-[#1d4ed8]" />
                <div>
                  <p className="font-mono font-bold text-xs uppercase tracking-wider text-[#1d4ed8]">
                    {t("rateSchoolPage.editModeTitle") || (locale === "vi" ? "Chỉnh sửa đánh giá trường" : "Edit School Rating")}
                  </p>
                  <p className="font-mono text-xs text-gray-800 mt-0.5">
                    {t("rateSchoolPage.editModeNotice") ||
                      (locale === "vi"
                        ? "Bạn đã từng đánh giá trường đại học này. Bạn có thể cập nhật thông tin hoặc xóa đánh giá bên dưới."
                        : "You have already rated this university. You can make changes or delete your rating below.")}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-[#eff6ff] border border-[#bfdbfe] text-xs sm:text-sm font-mono font-bold text-[#1d4ed8] flex items-start gap-2.5">
                <PopArtAlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#1d4ed8]" />
                <span>{error}</span>
              </div>
            )}

            {/* 10 Criteria Rating Cards */}
            {criteriaList.map((item) => {
              const selectedVal = criteria[item.key];
              const hoveredVal = hoveredCriteria[item.key] || null;
              const displayVal = hoveredVal || selectedVal;
              const displayLevel = displayVal ? getRatingLevelByValue(displayVal) : null;

              return (
                <div
                  key={item.key}
                  className="bg-white p-6 border border-gray-200 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block text-xs font-mono font-bold text-black uppercase tracking-wider">
                      {item.label}
                    </label>
                    {displayLevel && (
                      <div
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-gray-300 text-[11px] font-mono font-bold uppercase tracking-wider transition-colors"
                        style={{
                          backgroundColor: displayLevel.color,
                          color: "#000000",
                        }}
                      >
                        <span>{displayVal}</span>
                        <span>•</span>
                        <span>
                          {locale === "vi" ? displayLevel.labelVi : displayLevel.labelEn}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {RATING_LEVELS.map((lvl) => {
                      const isSelected = selectedVal === lvl.level;
                      const isHovered = hoveredVal === lvl.level;

                      const bg = isSelected
                        ? lvl.color
                        : isHovered
                        ? lvl.lightBg
                        : "#ffffff";

                      const textColor = isSelected
                        ? "#000000"
                        : isHovered
                        ? lvl.textColor
                        : "#000000";

                      return (
                        <button
                          key={lvl.level}
                          type="button"
                          onClick={() => handleCriterionChange(item.key, lvl.level)}
                          onMouseEnter={() =>
                            setHoveredCriteria((prev) => ({ ...prev, [item.key]: lvl.level }))
                          }
                          onMouseLeave={() =>
                            setHoveredCriteria((prev) => ({ ...prev, [item.key]: null }))
                          }
                          style={{
                            backgroundColor: bg,
                            color: textColor,
                          }}
                          className={`py-3 sm:py-3.5 text-center border transition-colors cursor-pointer flex flex-col items-center justify-center select-none ${
                            isSelected
                              ? "border-black font-black"
                              : isHovered
                              ? "border-gray-400 font-bold"
                              : "border-gray-200 font-bold"
                          }`}
                        >
                          <span className="font-mono font-black text-lg sm:text-xl leading-none">
                            {lvl.level}
                          </span>
                          <span className="font-mono font-bold text-[10px] sm:text-xs uppercase tracking-tight mt-1">
                            {locale === "vi" ? lvl.labelVi : lvl.labelEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-between text-xs font-mono font-medium text-gray-500 px-1 pt-0.5">
                    <span>{t("rateSchoolPage.scaleAwful") || (locale === "vi" ? "1 - Kém" : "1 - Awful")}</span>
                    <span>{t("rateSchoolPage.scaleAwesome") || (locale === "vi" ? "5 - Xuất sắc" : "5 - Awesome")}</span>
                  </div>
                </div>
              );
            })}

            {/* Write a Review Card */}
            <div className="bg-white p-6 border border-gray-200 space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-black uppercase tracking-wider">
                  {t("rateSchoolPage.writeReview") || "Write a Review"}
                </label>
                <p className="text-xs font-mono text-gray-600 mt-1">
                  {t("rateSchoolPage.writeReviewSubtitle") ||
                    "Discuss your personal experience on this school. What's great about it? What could use improvement?"}
                </p>
              </div>

              {/* Collapsible Guidelines Box */}
              <div className="border border-gray-200 bg-gray-50 text-xs font-mono text-black">
                <button
                  type="button"
                  onClick={() => setGuidelinesOpen((prev) => !prev)}
                  className="w-full px-4 py-2.5 flex items-center justify-between font-mono font-bold text-black hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center">
                    <span>{t("rateSchoolPage.guidelinesTitle") || "Guidelines"}</span>
                  </div>
                  {guidelinesOpen ? (
                    <PopArtChevronUp className="w-4 h-4 text-black" />
                  ) : (
                    <PopArtChevronDown className="w-4 h-4 text-black" />
                  )}
                </button>

                {guidelinesOpen && (
                  <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-gray-200">
                    <ul className="list-disc pl-5 space-y-1 text-gray-800">
                      <li>{t("rateSchoolPage.guideline1") || "Your rating could be removed if you use profanity or derogatory terms."}</li>
                      <li>{t("rateSchoolPage.guideline2") || "Relate to the rating categories to help you better elaborate your comments."}</li>
                      <li>{t("rateSchoolPage.guideline3") || "Don't forget to proof read!"}</li>
                    </ul>
                    <div className="pt-1">
                      <Link
                        href={`/${locale}/guidelines`}
                        target="_blank"
                        className="text-[#1d4ed8] underline hover:text-[#1e40af] font-bold"
                      >
                        {t("rateSchoolPage.viewAllGuidelines") || "View all guidelines"}
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <textarea
                  required
                  rows={5}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={
                    t("rateSchoolPage.reviewPlaceholder") ||
                    "What do you want other students to know about this school?"
                  }
                  className="w-full p-3.5 text-sm font-mono border border-gray-200 outline-none focus:outline-none focus:border-[#1d4ed8] text-black leading-relaxed"
                />
                <div className="flex items-center justify-between text-xs font-mono text-gray-500">
                  <span>
                    {reviewComment.length < 25 && (
                      <span className="text-[#1d4ed8] font-bold">
                        {t("rateSchoolPage.minCharNotice", { current: reviewComment.length }) ||
                          `Min 25 chars (${reviewComment.length}/350)`}
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-black">
                    {reviewComment.length} / 350
                  </span>
                </div>
              </div>

              {/* Student Identity / Cohort (Optional) */}
              <div className="pt-2 border-t border-gray-200">
                <label className="block text-xs font-mono font-bold text-black uppercase tracking-wider mb-1">
                  {t("rateSchoolPage.cohortLabel") || (locale === "vi" ? "Khóa học / Tên hiển thị (Tùy chọn)" : "Student Cohort / Display Name (Optional)")}
                </label>
                <input
                  type="text"
                  value={cohortName}
                  onChange={(e) => setCohortName(e.target.value)}
                  placeholder={t("rateSchoolPage.cohortPlaceholder") || (locale === "vi" ? "Niên khóa / Chuyên ngành (VD: K64 - CNTT)..." : "Cohort / Major (e.g. K64 - CS)...")}
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-200 outline-none focus:outline-none focus:border-[#1d4ed8] bg-white text-black"
                />
              </div>
            </div>

            {/* Disclaimer & Submit Button */}
            <div className="space-y-4 pt-2 text-center sm:text-left">
              <p className="text-[11px] font-mono text-gray-600 leading-normal">
                {t("rateSchoolPage.disclaimer") ||
                  "By clicking the \"Submit Rating\" button, I acknowledge that I have read and agreed to the Site Guidelines, Terms of Use and Privacy Policy."}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting || isDeleting}
                  className="w-full sm:w-auto px-10 py-3.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-mono font-bold uppercase tracking-wider border border-[#1d4ed8] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting
                    ? isEditMode
                      ? t("rateSchoolPage.updating") || (locale === "vi" ? "Đang cập nhật..." : "Updating...")
                      : t("rateSchoolPage.submitting") || (locale === "vi" ? "Đang gửi..." : "Submitting...")
                    : isEditMode
                    ? t("rateSchoolPage.updateButton") || (locale === "vi" ? "Cập nhật đánh giá" : "Update Rating")
                    : t("rateSchoolPage.submitButton") || (locale === "vi" ? "Gửi đánh giá" : "Submit Rating")}
                </button>

                {isEditMode && (
                  <button
                    type="button"
                    disabled={submitting || isDeleting}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full sm:w-auto px-6 py-3.5 bg-gray-50 hover:bg-gray-100 text-slate-700 text-sm font-mono font-bold uppercase tracking-wider border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <PopArtTrash className="w-4 h-4 text-slate-600" />
                    <span>{t("rateSchoolPage.deleteButton") || (locale === "vi" ? "Xóa đánh giá" : "Delete Rating")}</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-gray-200 p-6 sm:p-8 max-w-md w-full space-y-5 animate-in fade-in duration-150">
            <div className="w-12 h-12 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center">
              <PopArtTrash className="w-6 h-6 text-[#1d4ed8]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-mono font-bold text-black uppercase tracking-tight">
                {t("rateSchoolPage.deleteConfirmTitle") || (locale === "vi" ? "Xóa đánh giá này?" : "Delete School Rating?")}
              </h3>
              <p className="text-xs font-mono text-gray-700 leading-relaxed">
                {t("rateSchoolPage.deleteConfirmDesc") ||
                  (locale === "vi"
                    ? "Bạn có chắc chắn muốn xóa đánh giá của mình? Hành động này sẽ gỡ bỏ nhận xét và tính toán lại điểm tổng hợp của trường."
                    : "Are you sure you want to delete your school rating? This action will remove your review and recalculate aggregate scores.")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-gray-50 text-black font-mono font-bold text-xs uppercase tracking-wider border border-gray-200 transition-colors cursor-pointer"
              >
                {t("rateSchoolPage.cancel") || t("ratePage.cancel") || (locale === "vi" ? "Hủy" : "Cancel")}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#1d4ed8] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting
                  ? t("rateSchoolPage.deleting") || (locale === "vi" ? "Đang xóa..." : "Deleting...")
                  : t("rateSchoolPage.confirmDelete") || (locale === "vi" ? "Xác nhận xóa" : "Yes, Delete Rating")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal if triggered */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
