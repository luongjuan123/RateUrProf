"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { submitReview } from "@/lib/dataService";
import { Professor, CriteriaRatings } from "@/types";
import { useTranslation } from "@/locales/i18n";
import {
  PopArtStar,
  PopArtX,
  PopArtCheck,
  PopArtAlertCircle,
} from "@/components/icons/PopArtIcons";
import { isAnonymousName, resolveReviewerDisplayName } from "@/lib/formatters";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  professor: Professor;
  onReviewSubmitted: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  professor,
  onReviewSubmitted,
}) => {
  const { user, userProfile } = useAuth();
  const { locale, t } = useTranslation();

  const [overallRating, setOverallRating] = useState<number>(5);
  const [criteria, setCriteria] = useState<CriteriaRatings>({
    teachingQuality: 5,
    clarity: 5,
    gradingFairness: 5,
    difficulty: 3,
    communication: 5,
  });
  const [courseName, setCourseName] = useState("");
  const [gradeReceived, setGradeReceived] = useState("A");
  const [attendanceMandatory, setAttendanceMandatory] = useState(true);
  const [takeAgain, setTakeAgain] = useState(true);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [cohortName, setCohortName] = useState(userProfile?.cohort || "");
  const [agreeGuidelines, setAgreeGuidelines] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const popularTags = locale === "vi" ? [
    "Giảng bài tâm huyết",
    "Đề thi tư duy cao",
    "Chấm điểm công tâm",
    "Nhiều bài tập thực chiến",
    "Slide chi tiết",
    "Hài hước & gần gũi",
    "Điểm danh ngẫu nhiên",
    "Trả lời email nhanh",
    "Cho làm lại bài cải thiện"
  ] : [
    "Engaging Lectures",
    "Rigorous Exams",
    "Fair Grading",
    "Practical Labs",
    "Comprehensive Slides",
    "Approachable & Friendly",
    "Random Attendance",
    "Quick Email Responses",
    "Grade Revision Opportunities"
  ];

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length >= 5) return;
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCriteriaChange = (key: keyof CriteriaRatings, val: number) => {
    setCriteria((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) {
      setError(t("reviewModal.errorCourse"));
      return;
    }
    if (comment.trim().length < 25) {
      setError(t("reviewModal.errorCommentLength"));
      return;
    }
    if (!agreeGuidelines) {
      setError(t("reviewModal.errorGuidelines"));
      return;
    }

    if (!user) {
      setError(locale === "vi" ? "Vui lòng đăng nhập để đánh giá." : "Please sign in to rate.");
      return;
    }

    if (cohortName.trim() && isAnonymousName(cohortName.trim())) {
      setError(
        t("reviewModal.errorAnonymous") ||
          (locale === "vi"
            ? "Không được sử dụng tên ẩn danh khi gửi đánh giá."
            : "Cannot use an anonymous name when posting a review.")
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const studentName = resolveReviewerDisplayName(cohortName, user, userProfile);

      const res = await submitReview({
        professorId: professor.id,
        professorName: professor.name,
        universityId: professor.universityId,
        userId: user.uid,
        userDisplayName: studentName,
        courseName: courseName.trim(),
        gradeReceived,
        attendanceMandatory,
        takeAgain,
        overallRating,
        criteria,
        comment: comment.trim(),
        reviewLanguage: locale,
        tags: selectedTags,
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onReviewSubmitted();
          onClose();
        }, 1500);
      } else {
        setError(res.error || t("common.error"));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const uniName = locale === "en" ? professor.universityNameEn : professor.universityNameVi;
  const faculty = locale === "en" ? professor.facultyEn : professor.facultyVi;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-[#111111] my-8 overflow-hidden">
        {/* Editorial Top Accent Stripe */}
        <div className="h-1.5 bg-[#e03a3e] border-b border-[#111111] w-full" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#111111] flex items-center justify-between bg-white">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#e03a3e]">
              {t("reviewModal.modalTag")}
            </span>
            <h2 className="text-xl font-mono font-bold text-black tracking-tight">
              {professor.name}
            </h2>
            <p className="text-xs font-mono text-gray-700">
              {uniName} • {faculty}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-1.5 text-black hover:bg-gray-100 border border-[#111111] transition-colors"
          >
            <PopArtX className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {success ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center justify-center mx-auto">
              <PopArtCheck className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-mono font-bold text-black uppercase">
              {t("reviewModal.successTitle")}
            </h3>
            <p className="text-sm font-mono text-gray-700 max-w-md mx-auto">
              {t("reviewModal.successDesc")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs font-mono font-medium text-red-800 flex items-start gap-2">
                <PopArtAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Overall Rating (1 - 5 Stars) */}
            <div className="bg-white p-5 border border-[#111111] text-center space-y-2">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black">
                {t("reviewModal.overallRatingLabel")}
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setOverallRating(star)}
                    aria-label={`${star} Stars`}
                    className="p-1 hover:scale-105 transition-transform"
                  >
                    <PopArtStar
                      className="w-8 h-8"
                      filled={star <= overallRating}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-mono font-bold text-black">
                {overallRating === 5 && t("reviewModal.ratingDesc5")}
                {overallRating === 4 && t("reviewModal.ratingDesc4")}
                {overallRating === 3 && t("reviewModal.ratingDesc3")}
                {overallRating === 2 && t("reviewModal.ratingDesc2")}
                {overallRating === 1 && t("reviewModal.ratingDesc1")}
              </p>
            </div>

            {/* 5 Criteria Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-black border-l-2 border-[#e03a3e] pl-2">
                {t("reviewModal.criteriaSectionTitle")}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Teaching Quality */}
                <div className="p-3 bg-white border border-[#111111] space-y-1.5">
                  <div className="flex justify-between text-xs font-mono font-bold text-black">
                    <span>{t("reviewModal.teachingQuality")}</span>
                    <span className="text-[#e03a3e] font-bold">{criteria.teachingQuality} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={criteria.teachingQuality}
                    onChange={(e) => handleCriteriaChange("teachingQuality", Number(e.target.value))}
                    className="w-full accent-[#e03a3e]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-gray-500 font-medium">
                    <span>{t("reviewModal.teachingLow")}</span>
                    <span>{t("reviewModal.teachingHigh")}</span>
                  </div>
                </div>

                {/* 2. Clarity */}
                <div className="p-3 bg-white border border-[#111111] space-y-1.5">
                  <div className="flex justify-between text-xs font-mono font-bold text-black">
                    <span>{t("reviewModal.clarity")}</span>
                    <span className="text-[#e03a3e] font-bold">{criteria.clarity} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={criteria.clarity}
                    onChange={(e) => handleCriteriaChange("clarity", Number(e.target.value))}
                    className="w-full accent-[#e03a3e]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-gray-500 font-medium">
                    <span>{t("reviewModal.clarityLow")}</span>
                    <span>{t("reviewModal.clarityHigh")}</span>
                  </div>
                </div>

                {/* 3. Grading Fairness */}
                <div className="p-3 bg-white border border-[#111111] space-y-1.5">
                  <div className="flex justify-between text-xs font-mono font-bold text-black">
                    <span>{t("reviewModal.gradingFairness")}</span>
                    <span className="text-[#e03a3e] font-bold">{criteria.gradingFairness} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={criteria.gradingFairness}
                    onChange={(e) => handleCriteriaChange("gradingFairness", Number(e.target.value))}
                    className="w-full accent-[#e03a3e]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-gray-500 font-medium">
                    <span>{t("reviewModal.gradingLow")}</span>
                    <span>{t("reviewModal.gradingHigh")}</span>
                  </div>
                </div>

                {/* 4. Difficulty */}
                <div className="p-3 bg-white border border-[#111111] space-y-1.5">
                  <div className="flex justify-between text-xs font-mono font-bold text-black">
                    <span>{t("reviewModal.difficulty")}</span>
                    <span className="text-[#e03a3e] font-bold">{criteria.difficulty} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={criteria.difficulty}
                    onChange={(e) => handleCriteriaChange("difficulty", Number(e.target.value))}
                    className="w-full accent-[#e03a3e]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-gray-500 font-medium">
                    <span>{t("reviewModal.difficultyLow")}</span>
                    <span>{t("reviewModal.difficultyHigh")}</span>
                  </div>
                </div>

                {/* 5. Communication */}
                <div className="p-3 bg-white border border-[#111111] space-y-1.5 md:col-span-2">
                  <div className="flex justify-between text-xs font-mono font-bold text-black">
                    <span>{t("reviewModal.communication")}</span>
                    <span className="text-[#e03a3e] font-bold">{criteria.communication} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={criteria.communication}
                    onChange={(e) => handleCriteriaChange("communication", Number(e.target.value))}
                    className="w-full accent-[#e03a3e]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-gray-500 font-medium">
                    <span>{t("reviewModal.communicationLow")}</span>
                    <span>{t("reviewModal.communicationHigh")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Course & Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono font-bold text-black uppercase tracking-wider mb-1">
                  {t("reviewModal.courseLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder={t("reviewModal.coursePlaceholder")}
                  className="w-full px-3 py-2 text-xs border border-gray-300 focus:border-[#111111] outline-none font-mono text-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-black uppercase tracking-wider mb-1">
                  {t("reviewModal.gradeLabel")}
                </label>
                <select
                  value={gradeReceived}
                  onChange={(e) => setGradeReceived(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 focus:border-[#111111] outline-none font-mono text-black bg-white cursor-pointer"
                >
                  <option value="A">A (4.0)</option>
                  <option value="B+">B+ (3.5)</option>
                  <option value="B">B (3.0)</option>
                  <option value="C+">C+ (2.5)</option>
                  <option value="C">C (2.0)</option>
                  <option value="D">D (1.0)</option>
                  <option value="Passed">{t("home.gradePassed")}</option>
                </select>
              </div>

              {/* Attendance & Take Again */}
              <div className="space-y-1">
                <span className="block text-[11px] font-mono font-bold text-black uppercase tracking-wider">
                  {t("reviewModal.attendanceLabel")}
                </span>
                <div className="flex gap-4 text-xs font-mono font-medium">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="attendance"
                      checked={attendanceMandatory}
                      onChange={() => setAttendanceMandatory(true)}
                      className="accent-[#e03a3e]"
                    />
                    <span>{t("reviewModal.attendanceMandatory")}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="attendance"
                      checked={!attendanceMandatory}
                      onChange={() => setAttendanceMandatory(false)}
                      className="accent-[#e03a3e]"
                    />
                    <span>{t("reviewModal.attendanceOptional")}</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-[11px] font-mono font-bold text-black uppercase tracking-wider">
                  {t("reviewModal.takeAgainLabel")}
                </span>
                <div className="flex gap-4 text-xs font-mono font-medium">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="takeAgain"
                      checked={takeAgain}
                      onChange={() => setTakeAgain(true)}
                      className="accent-[#e03a3e]"
                    />
                    <span className="text-black bg-gray-100 px-1.5 py-0.5 border border-gray-300">{t("reviewModal.takeAgainYes")}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="takeAgain"
                      checked={!takeAgain}
                      onChange={() => setTakeAgain(false)}
                      className="accent-[#e03a3e]"
                    />
                    <span className="text-black bg-gray-100 px-1.5 py-0.5 border border-gray-300">{t("reviewModal.takeAgainNo")}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Quick Tags */}
            <div className="space-y-2">
              <label className="block text-[11px] font-mono font-bold text-black uppercase tracking-wider">
                {t("reviewModal.tagsLabel")}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {popularTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`px-2.5 py-1 text-xs border border-[#111111] font-mono font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#111111] text-white"
                          : "bg-white text-black hover:bg-gray-100"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Written Review */}
            <div>
              <label className="block text-[11px] font-mono font-bold text-black uppercase tracking-wider mb-1">
                {t("reviewModal.writtenReviewLabel")}
              </label>
              <textarea
                required
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("reviewModal.writtenReviewPlaceholder")}
                className="w-full px-3 py-2 text-xs border border-gray-300 focus:border-[#111111] outline-none font-mono text-black leading-relaxed"
              />
              <div className="flex justify-between text-[11px] font-mono text-gray-500 mt-1">
                <span>{t("reviewModal.constructiveHint")}</span>
                <span className="font-bold text-black">{t("reviewModal.charCount", { count: comment.length })}</span>
              </div>
            </div>

            {/* Pseudonymous Cohort */}
            <div>
              <label className="block text-[11px] font-mono font-bold text-black uppercase tracking-wider mb-1">
                {t("reviewModal.cohortLabel")}
              </label>
              <input
                type="text"
                value={cohortName}
                onChange={(e) => setCohortName(e.target.value)}
                placeholder={t("reviewModal.cohortPlaceholder")}
                className="w-full px-3 py-2 text-xs border border-gray-300 focus:border-[#111111] outline-none font-mono text-black"
              />
              <p className="text-[10px] font-mono text-gray-600 mt-1">
                {t("reviewModal.cohortNote", {
                  name: resolveReviewerDisplayName(cohortName, user, userProfile)
                })}
              </p>
            </div>

            {/* Guidelines Checkbox */}
            <div className="p-3 bg-gray-50 border border-gray-300 text-xs font-mono font-medium text-black space-y-2">
              <label className="flex items-start gap-2 cursor-pointer text-black">
                <input
                  type="checkbox"
                  required
                  checked={agreeGuidelines}
                  onChange={(e) => setAgreeGuidelines(e.target.checked)}
                  className="mt-0.5 accent-[#e03a3e]"
                />
                <span>{t("reviewModal.guidelinesCheckbox")}</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#111111]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono font-bold text-black border border-[#111111] hover:bg-gray-100 uppercase tracking-wider transition-colors cursor-pointer"
              >
                {t("reviewModal.cancel")}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[#e03a3e] hover:bg-[#c93236] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#e03a3e] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? t("reviewModal.submitting") : t("reviewModal.submit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
