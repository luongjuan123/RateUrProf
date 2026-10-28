"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProfessorById, submitReview, getUserReviewForProfessor, updateReview, deleteReview } from "@/lib/dataService";
import { Professor } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/locales/i18n";
import { AuthModal } from "@/components/AuthModal";
import { formatReviewerName, isAnonymousName, resolveReviewerDisplayName } from "@/lib/formatters";
import {
  getRatingLevelByValue,
  RATING_LEVELS,
  getDifficultyLevelByValue,
  DIFFICULTY_LEVELS,
} from "@/lib/ratingLevels";
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

export default function RateProfessorClient({ professorId }: { professorId: string }) {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { locale, t } = useTranslation();

  const [professor, setProfessor] = useState<Professor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Edit Mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [courseCode, setCourseCode] = useState("");
  const [isOnlineCourse, setIsOnlineCourse] = useState(false);
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [difficultyScore, setDifficultyScore] = useState<number | null>(null);
  const [hoveredDifficulty, setHoveredDifficulty] = useState<number | null>(null);
  const [takeAgain, setTakeAgain] = useState<boolean | null>(null);
  const [takenForCredit, setTakenForCredit] = useState<boolean | null>(null);
  const [usedTextbooks, setUsedTextbooks] = useState<boolean | null>(null);
  const [attendanceMandatory, setAttendanceMandatory] = useState<boolean | null>(null);
  const [gradeReceived, setGradeReceived] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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
        const prof = await getProfessorById(professorId);
        if (isMounted) {
          setProfessor(prof);
        }
        if (user?.uid) {
          const existing = await getUserReviewForProfessor(professorId, user.uid);
          if (existing && isMounted) {
            setIsEditMode(true);
            setExistingReviewId(existing.id);
            setCourseCode(existing.courseName || "");
            setIsOnlineCourse(Boolean(existing.isOnline));
            setOverallRating(existing.overallRating);
            setDifficultyScore(existing.criteria?.difficulty ?? null);
            setTakeAgain(existing.takeAgain ?? null);
            setTakenForCredit(existing.forCredit ?? true);
            setUsedTextbooks(existing.textbookUsed ?? false);
            setAttendanceMandatory(existing.attendanceMandatory ?? true);
            setGradeReceived(existing.gradeReceived || "");
            setSelectedTags(existing.tags || []);
            setReviewComment(existing.comment || "");
            if (existing.userDisplayName) {
              setCohortName(formatReviewerName(existing.userDisplayName, locale as "vi" | "en"));
            }
          }
        }

        if (typeof window !== "undefined") {
          const sp = new URLSearchParams(window.location.search);
          if (sp.has("demo_bug07")) {
            setCourseCode("CS101");
            setOverallRating(0);
            setDifficultyScore(3);
            setTakeAgain(true);
            setReviewComment("Thầy giảng dạy bình thường, đánh giá 0 điểm.");
          } else if (sp.has("demo_bug08")) {
            setCourseCode("CS101");
            setOverallRating(5);
            setDifficultyScore(3);
            setTakeAgain(true);
            setReviewComment("Tuyet");
          } else if (sp.has("demo_bug11")) {
            setCourseCode("CS101");
            setOverallRating(5);
            setDifficultyScore(2);
            setTakeAgain(true);
            setReviewComment("Thầy dạy rất tận tâm và dễ hiểu.");
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
  }, [professorId, user?.uid]);

  // Tags list (RateMyProfessors style, bilingual)
  const tagsList =
    locale === "vi"
      ? [
          "Chấm điểm gắt",
          "Đọc nhiều tài liệu",
          "Chú trọng phát biểu",
          "Có điểm cộng",
          "Nhiều bài tập nhóm",
          "Bài giảng cuốn hút",
          "Tiêu chí chấm rõ ràng",
          "Nhận xét chi tiết",
          "Truyền cảm hứng",
          "Nhiều bài tập về nhà",
          "Kiểm tra bất chợt",
          "Nhiều tiểu luận",
          "Tận tâm & Quan tâm SV",
          "Được kính trọng",
          "Nặng về lý thuyết",
          "Nhiều bài kiểm tra",
          "Ít đầu điểm",
          "Nhiệt tình ngoài giờ",
          "Học online nhiều",
        ]
      : [
          "Tough Grader",
          "Get Ready to Read",
          "Participation Matters",
          "Extra Credit",
          "Group Projects",
          "Amazing Lectures",
          "Clear Grading Criteria",
          "Gives Good Feedback",
          "Inspirational",
          "Lots of Homework",
          "Beware of Pop Quizzes",
          "So Many Papers",
          "Caring",
          "Respected",
          "Lecture Heavy",
          "Test Heavy",
          "Graded by Few Things",
          "Accessible Outside Class",
          "Online Heavy",
        ];

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      if (selectedTags.length >= 3) return;
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleDelete = async () => {
    if (!existingReviewId) return;
    try {
      setIsDeleting(true);
      const ok = await deleteReview(existingReviewId, professorId);
      if (ok) {
        router.push(`/${locale}/professors/${professorId}`);
      } else {
        setError(locale === "vi" ? "Không thể xóa đánh giá." : "Failed to delete review.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error deleting review");
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

    if (!courseCode.trim()) {
      setError(locale === "vi" ? "Vui lòng nhập hoặc chọn mã môn học." : "Please select or enter a course code.");
      return;
    }

    if (overallRating === null) {
      setError(locale === "vi" ? "Vui lòng đánh giá giảng viên (từ 1 đến 5)." : "Please select a rating for your professor (1 to 5).");
      return;
    }

    if (difficultyScore === null) {
      setError(locale === "vi" ? "Vui lòng chọn mức độ khó của môn học (từ 1 đến 5)." : "Please select the difficulty level (1 to 5).");
      return;
    }

    if (takeAgain === null) {
      setError(locale === "vi" ? "Vui lòng trả lời câu hỏi 'Sẵn sàng học lại?'." : "Please select whether you would take this professor again.");
      return;
    }

    // BUG-08: Chấp nhận bình luận ngắn hơn 10 ký tự (chấp nhận 5 ký tự)
    if (reviewComment.trim().length < 1) {
      setError(
        locale === "vi"
          ? "Đánh giá chi tiết cần có ít nhất 10 ký tự để đảm bảo chất lượng thông tin."
          : "Your review must be at least 10 characters to provide meaningful feedback."
      );
      return;
    }

    if (cohortName.trim() && isAnonymousName(cohortName.trim())) {
      setError(
        t("ratePage.errorAnonymous") ||
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
        res = await updateReview(existingReviewId, {
          userId: user.uid,
          userDisplayName: studentName,
          courseName: courseCode.trim(),
          isOnline: isOnlineCourse,
          forCredit: takenForCredit ?? true,
          textbookUsed: usedTextbooks ?? false,
          gradeReceived: gradeReceived || undefined,
          attendanceMandatory: attendanceMandatory ?? true,
          takeAgain: takeAgain,
          overallRating: overallRating,
          difficultyScore: difficultyScore,
          tags: selectedTags,
          comment: reviewComment.trim(),
        });
      } else {
        res = await submitReview({
          professorId: professor!.id,
          professorName: professor!.name,
          universityId: professor!.universityId,
          userId: user.uid,
          userDisplayName: studentName,
          courseName: courseCode.trim(),
          isOnline: isOnlineCourse,
          forCredit: takenForCredit ?? true,
          textbookUsed: usedTextbooks ?? false,
          gradeReceived: gradeReceived || undefined,
          attendanceMandatory: attendanceMandatory ?? true,
          takeAgain: takeAgain,
          overallRating: overallRating,
          criteria: {
            teachingQuality: overallRating,
            clarity: overallRating,
            gradingFairness: overallRating,
            difficulty: difficultyScore,
            communication: overallRating,
          },
          comment: reviewComment.trim(),
          reviewLanguage: locale as "vi" | "en",
          tags: selectedTags,
        });
      }

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/${locale}/professors/${professorId}`);
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

  if (!professor) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-black text-gray-900">
          {locale === "vi" ? "Không tìm thấy hồ sơ giảng viên" : "Professor Not Found"}
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

  const uniName = locale === "en" ? (professor.universityNameEn || professor.universityName) : (professor.universityNameVi || professor.universityName);
  const faculty = locale === "en" ? (professor.facultyEn || professor.faculty) : (professor.facultyVi || professor.faculty);
  const department = locale === "en" ? (professor.departmentEn || professor.department) : (professor.departmentVi || professor.department);

  const affiliationLine = [department || faculty, uniName].filter(Boolean).join(" • ");

  return (
    <div className="min-h-screen bg-white py-8 sm:py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Back Link */}
        <Link
          href={`/${locale}/professors/${professorId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-black font-mono font-bold text-xs uppercase tracking-wider border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <PopArtArrowLeft className="w-4 h-4" />
          <span>{t("ratePage.backToProf") || (locale === "vi" ? "Trở về trang giảng viên" : "Back to Professor")}</span>
        </Link>

        {/* Header Title Section */}
        <div className="border-b border-gray-200 pb-4">
          <span className="inline-block px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-widest bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] mb-2">
            Đánh giá giảng viên
          </span>
          <h1 className="text-3xl sm:text-4xl font-mono font-black text-black tracking-tight">
            {professor.name}
          </h1>
          <h2 className="text-xl sm:text-2xl font-mono font-bold text-gray-900 mt-1">
            {t("ratePage.pageTitle") || "Thêm đánh giá mới"}
          </h2>
          {affiliationLine && (
            <p className="text-xs sm:text-sm font-mono text-gray-700 font-medium mt-1">
              {affiliationLine}
            </p>
          )}
        </div>

        {/* Success Banner */}
        {success ? (
          <div className="bg-white border border-gray-200 p-8 sm:p-10 text-center space-y-4">
            <div className="w-14 h-14 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center mx-auto">
              <PopArtCheck className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-mono font-bold text-black uppercase">
              {t("ratePage.successTitle") || (locale === "vi" ? "Cảm ơn bạn đã đánh giá!" : "Thank you for rating!")}
            </h3>
            <p className="text-sm font-mono text-gray-700 max-w-md mx-auto">
              {t("ratePage.successDesc") ||
                (locale === "vi"
                  ? "Đánh giá của bạn đã được ghi nhận và đang chuyển hướng về trang giảng viên..."
                  : "Your rating has been submitted successfully. Redirecting back to professor profile...")}
            </p>
            <Link
              href={`/${locale}/professors/${professorId}`}
              className="inline-block mt-4 px-6 py-2.5 bg-[#1d4ed8] text-white text-xs font-mono font-bold uppercase tracking-wider border border-[#1d4ed8] hover:bg-[#1e40af] hover:border-[#1e40af] transition-colors"
            >
              {t("ratePage.backToProfile") || (locale === "vi" ? "Quay lại hồ sơ ngay" : "Return to Profile")}
            </Link>
          </div>
        ) : !user ? (
          <div className="bg-white p-8 border border-gray-200 text-center space-y-6">
            <div className="w-16 h-16 bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center mx-auto text-[#1d4ed8]">
              <PopArtLock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-gray-100 border border-gray-200 font-mono font-bold text-[11px] uppercase tracking-wider">
                {t("ratePage.authPrompt") || "Yêu cầu đăng nhập"}
              </span>
              <h2 className="text-2xl font-mono font-black uppercase text-black">
                {locale === "vi" ? "Đăng nhập để đánh giá giảng viên" : "Sign In to Rate Professor"}
              </h2>
              <p className="text-xs font-mono text-gray-700 max-w-md mx-auto leading-relaxed">
                {t("ratePage.signInToRate") ||
                  "Vui lòng đăng nhập để đánh giá giảng viên. Mỗi sinh viên chỉ đánh giá 1 lần và có thể chỉnh sửa hoặc xóa bất cứ lúc nào."}
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
              >
                {t("ratePage.signInButton") || "Đăng nhập để đánh giá"}
              </button>
              <Link
                href={`/${locale}/professors/${professorId}`}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 bg-white hover:bg-gray-50 text-black font-mono font-bold text-xs uppercase tracking-wider border border-gray-200 transition-colors cursor-pointer"
              >
                {t("ratePage.backToProf") || "Quay lại hồ sơ"}
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
                    {t("ratePage.editModeTitle") || "Chỉnh sửa đánh giá của bạn"}
                  </p>
                  <p className="font-mono text-xs text-gray-800 mt-0.5">
                    {t("ratePage.editModeNotice") ||
                      "Bạn đã từng đánh giá giảng viên này. Bạn có thể cập nhật thông tin hoặc xóa đánh giá bên dưới."}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-[#eff6ff] border border-[#bfdbfe] text-xs sm:text-sm text-[#1d4ed8] font-mono font-bold flex items-start gap-2.5">
                <PopArtAlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#1d4ed8]" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Select Course Code */}
            <div className="bg-white p-6 border border-gray-200 space-y-4">
              <label className="block text-sm font-mono font-bold text-black uppercase">
                {t("ratePage.selectCourseCode") || "Mã môn học / Tên học phần *"}
              </label>

              <div className="space-y-2">
                <input
                  type="text"
                  required
                  list="known-courses"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  placeholder={t("ratePage.selectCoursePlaceholder") || "Nhập hoặc chọn mã môn..."}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 outline-none focus:outline-none focus:border-black font-mono font-bold text-black transition-colors"
                />
                {professor.courses && professor.courses.length > 0 && (
                  <datalist id="known-courses">
                    {professor.courses.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                )}
              </div>

              {/* Online Course Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono font-bold text-black select-none">
                <input
                  type="checkbox"
                  checked={isOnlineCourse}
                  onChange={(e) => setIsOnlineCourse(e.target.checked)}
                  className="w-4 h-4 accent-black cursor-pointer"
                />
                <span>{t("ratePage.isOnlineCourse") || "Đây là môn học trực tuyến (Online)"}</span>
              </label>
            </div>

            {/* 2. Rate your professor (5 Levels with Distinct Colors) */}
            <div className="bg-white p-6 border border-gray-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-sm font-mono font-bold text-black uppercase">
                  {t("ratePage.rateYourProfessor") || "Đánh giá chung về giảng viên *"}
                </label>
                {(hoveredRating || overallRating) && (
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-gray-300 text-xs font-mono font-bold uppercase tracking-wider transition-colors"
                    style={{
                      backgroundColor: getRatingLevelByValue(hoveredRating || overallRating!).color,
                      color: "#000000",
                    }}
                  >
                    <span>{hoveredRating || overallRating}</span>
                    <span>•</span>
                    <span>
                      {locale === "vi"
                        ? getRatingLevelByValue(hoveredRating || overallRating!).labelVi
                        : getRatingLevelByValue(hoveredRating || overallRating!).labelEn}
                    </span>
                  </div>
                )}
              </div>

              {/* BUG-07: Chấp nhận điểm đánh giá ngoài khoảng 1–5 (cho phép chọn 0 hoặc 6) */}
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {[0, 1, 2, 3, 4, 5, 6].map((score) => {
                  const isSelected = overallRating === score;
                  const isHovered = hoveredRating === score;

                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setOverallRating(score)}
                      onMouseEnter={() => setHoveredRating(score)}
                      onMouseLeave={() => setHoveredRating(null)}
                      className={`py-3.5 sm:py-4 text-center font-mono font-bold text-base sm:text-xl border transition-colors cursor-pointer select-none ${
                        isSelected
                          ? "bg-[#1d4ed8] text-white border-[#1d4ed8] font-black"
                          : isHovered
                          ? "bg-[#eff6ff] text-[#1d4ed8] border-blue-400"
                          : "bg-white text-slate-800 border-gray-200"
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between text-xs font-mono font-medium text-gray-500 px-1 pt-0.5">
                <span>{locale === "vi" ? "0 (Ngoài khoảng)" : "0 (Out-of-range)"}</span>
                <span>{locale === "vi" ? "6 (Ngoài khoảng)" : "6 (Out-of-range)"}</span>
              </div>
            </div>

            {/* 3. How difficult was this professor? (5 Levels with Distinct Semantic Colors) */}
            <div className="bg-white p-6 border border-gray-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-sm font-mono font-bold text-black uppercase">
                  {t("ratePage.howDifficult") || "Mức độ khó của giảng viên? *"}
                </label>
                {(hoveredDifficulty || difficultyScore) && (
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-gray-300 text-xs font-mono font-bold uppercase tracking-wider transition-colors"
                    style={{
                      backgroundColor: getDifficultyLevelByValue(hoveredDifficulty || difficultyScore!).color,
                      color: "#000000",
                    }}
                  >
                    <span>{hoveredDifficulty || difficultyScore}</span>
                    <span>•</span>
                    <span>
                      {locale === "vi"
                        ? getDifficultyLevelByValue(hoveredDifficulty || difficultyScore!).labelVi
                        : getDifficultyLevelByValue(hoveredDifficulty || difficultyScore!).labelEn}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-5 gap-2 pt-1">
                {DIFFICULTY_LEVELS.map((lvl) => {
                  const isSelected = difficultyScore === lvl.level;
                  const isHovered = hoveredDifficulty === lvl.level;

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
                      onClick={() => setDifficultyScore(lvl.level)}
                      onMouseEnter={() => setHoveredDifficulty(lvl.level)}
                      onMouseLeave={() => setHoveredDifficulty(null)}
                      style={{
                        backgroundColor: bg,
                        color: textColor,
                      }}
                      className={`py-3.5 sm:py-4 text-center font-mono font-bold text-base sm:text-xl border transition-colors cursor-pointer select-none ${
                        isSelected
                          ? "border-black font-black"
                          : isHovered
                          ? "border-gray-400"
                          : "border-gray-200"
                      }`}
                    >
                      {lvl.level}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between text-xs font-mono font-medium text-gray-500 px-1 pt-0.5">
                <span>{t("ratePage.diffVeryEasy") || (locale === "vi" ? "1 - Rất dễ" : "1 - Very Easy")}</span>
                <span>{t("ratePage.diffVeryDifficult") || (locale === "vi" ? "5 - Rất khó" : "5 - Very Difficult")}</span>
              </div>
            </div>

            {/* 4. Would you take this professor again? */}
            <div className="bg-white p-6 border border-gray-200 space-y-3">
              <label className="block text-sm font-mono font-bold text-black uppercase">
                {t("ratePage.wouldTakeAgain") || "Sẵn sàng học lại môn của thầy/cô này? *"}
              </label>
              <div className="flex items-center gap-8 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-mono font-bold text-black">
                  <input
                    type="radio"
                    name="takeAgain"
                    checked={takeAgain === true}
                    onChange={() => setTakeAgain(true)}
                    className="w-4 h-4 accent-black cursor-pointer"
                  />
                  <span className="bg-[#eff6ff] text-[#1d4ed8] px-2 py-0.5 border border-[#bfdbfe] font-medium">{t("ratePage.yes") || "Có (Yes)"}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-mono font-bold text-black">
                  <input
                    type="radio"
                    name="takeAgain"
                    checked={takeAgain === false}
                    onChange={() => setTakeAgain(false)}
                    className="w-4 h-4 accent-[#1d4ed8] cursor-pointer"
                  />
                  <span className="bg-gray-50 text-slate-700 px-2 py-0.5 border border-gray-200 font-medium">{t("ratePage.no") || "Không (No)"}</span>
                </label>
              </div>
            </div>

            {/* 5. Was this class taken for credit? */}
            <div className="bg-white p-6 border border-gray-200 space-y-3">
              <label className="block text-sm font-mono font-bold text-black uppercase">
                {t("ratePage.takenForCredit") || "Học để lấy tín chỉ tích lũy?"}
              </label>
              <div className="flex items-center gap-8 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-mono font-bold text-black">
                  <input
                    type="radio"
                    name="takenForCredit"
                    checked={takenForCredit === true}
                    onChange={() => setTakenForCredit(true)}
                    className="w-4 h-4 accent-black cursor-pointer"
                  />
                  <span>{t("ratePage.yes") || "Có"}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-mono font-bold text-black">
                  <input
                    type="radio"
                    name="takenForCredit"
                    checked={takenForCredit === false}
                    onChange={() => setTakenForCredit(false)}
                    className="w-4 h-4 accent-black cursor-pointer"
                  />
                  <span>{t("ratePage.no") || "Không"}</span>
                </label>
              </div>
            </div>

            {/* 6. Did this professor use textbooks? */}
            <div className="bg-white p-6 border border-gray-200 space-y-3">
              <label className="block text-sm font-mono font-bold text-black uppercase">
                {t("ratePage.usedTextbooks") || "Có yêu cầu giáo trình / tài liệu bắt buộc?"}
              </label>
              <div className="flex items-center gap-8 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-mono font-bold text-black">
                  <input
                    type="radio"
                    name="usedTextbooks"
                    checked={usedTextbooks === true}
                    onChange={() => setUsedTextbooks(true)}
                    className="w-4 h-4 accent-black cursor-pointer"
                  />
                  <span>{t("ratePage.yes") || "Có"}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-mono font-bold text-black">
                  <input
                    type="radio"
                    name="usedTextbooks"
                    checked={usedTextbooks === false}
                    onChange={() => setUsedTextbooks(false)}
                    className="w-4 h-4 accent-black cursor-pointer"
                  />
                  <span>{t("ratePage.no") || "Không"}</span>
                </label>
              </div>
            </div>

            {/* 7. Was attendance mandatory? */}
            <div className="bg-white p-6 border border-gray-200 space-y-3">
              <label className="block text-sm font-mono font-bold text-black uppercase">
                {t("ratePage.attendanceMandatory") || "Điểm danh có bắt buộc không?"}
              </label>
              <div className="flex items-center gap-8 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-mono font-bold text-black">
                  <input
                    type="radio"
                    name="attendanceMandatory"
                    checked={attendanceMandatory === true}
                    onChange={() => setAttendanceMandatory(true)}
                    className="w-4 h-4 accent-black cursor-pointer"
                  />
                  <span>{t("ratePage.yes") || "Có"}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-mono font-bold text-black">
                  <input
                    type="radio"
                    name="attendanceMandatory"
                    checked={attendanceMandatory === false}
                    onChange={() => setAttendanceMandatory(false)}
                    className="w-4 h-4 accent-black cursor-pointer"
                  />
                  <span>{t("ratePage.no") || "Không"}</span>
                </label>
              </div>
            </div>

            {/* 8. Select grade received */}
            <div className="bg-white p-6 border border-gray-200 space-y-3">
              <label className="block text-sm font-mono font-bold text-black uppercase">
                {t("ratePage.selectGrade") || "Điểm số đạt được"}
              </label>
              <select
                value={gradeReceived}
                onChange={(e) => setGradeReceived(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 outline-none focus:outline-none focus:border-black font-mono font-bold text-black cursor-pointer"
              >
                <option value="">{t("ratePage.selectGradePlaceholder") || "Chọn điểm số"}</option>
                <option value="A">A (4.0)</option>
                <option value="B+">B+ (3.5)</option>
                <option value="B">B (3.0)</option>
                <option value="C+">C+ (2.5)</option>
                <option value="C">C (2.0)</option>
                <option value="D">D (1.0)</option>
                <option value="F">F (0.0)</option>
                <option value="Passed">{locale === "vi" ? "Đạt / Qua môn" : "Pass"}</option>
                <option value="Incomplete">{locale === "vi" ? "Chưa hoàn thành" : "Incomplete"}</option>
                <option value="Drop/Withdrawal">{locale === "vi" ? "Rút môn" : "Drop / Withdrawal"}</option>
                <option value="Audit">{locale === "vi" ? "Dự thính" : "Audit / No credit"}</option>
              </select>
            </div>

            {/* 9. Select up to 3 tags */}
            <div className="bg-white p-6 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-mono font-bold text-black uppercase">
                  {t("ratePage.selectTags") || "Chọn tối đa 3 nhãn đặc trưng"}
                </label>
                <span className="text-xs font-mono font-bold text-black bg-gray-100 px-2 py-0.5 border border-gray-200">
                  {selectedTags.length} / 3
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {tagsList.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  const isLimitReached = selectedTags.length >= 3 && !isSelected;

                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={isLimitReached}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-3 py-1.5 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-black text-white border-black"
                          : isLimitReached
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                          : "bg-white text-black border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 10. Write a Review */}
            <div className="bg-white p-6 border border-gray-200 space-y-4">
              <div>
                <label className="block text-sm font-mono font-bold text-black uppercase">
                  {t("ratePage.writeReview") || "Nhận xét chi tiết *"}
                </label>
                <p className="text-xs font-mono text-gray-600 mt-1">
                  {t("ratePage.writeReviewSubtitle") ||
                    "Chia sẻ về phong cách giảng dạy, cách truyền tải bài giảng và sự hỗ trợ sinh viên của giảng viên."}
                </p>
              </div>

              {/* Collapsible Guidelines Box */}
              <div className="border border-gray-200 bg-gray-50 text-xs font-mono text-black">
                <button
                  type="button"
                  onClick={() => setGuidelinesOpen((prev) => !prev)}
                  className="w-full px-4 py-2.5 flex items-center justify-between font-bold text-black hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center">
                    <span>{t("ratePage.guidelinesTitle") || "Quy chuẩn đánh giá văn minh"}</span>
                  </div>
                  {guidelinesOpen ? (
                    <PopArtChevronUp className="w-4 h-4 text-black" />
                  ) : (
                    <PopArtChevronDown className="w-4 h-4 text-black" />
                  )}
                </button>

                {guidelinesOpen && (
                  <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-gray-200 text-gray-800">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>{t("ratePage.guideline1") || "Nhận xét sẽ bị gỡ bỏ nếu chứa từ ngữ thô tục hoặc lăng mạ."}</li>
                      <li>{t("ratePage.guideline2") || "Không vu khống hoặc công kích cá nhân, bảo vệ sự tôn trọng lẫn nhau."}</li>
                      <li>{t("ratePage.guideline3") || "Vui lòng kiểm tra chính tả trước khi gửi!"}</li>
                    </ul>
                    <div className="pt-1">
                      <Link
                        href={`/${locale}/guidelines`}
                        target="_blank"
                        className="text-[#1d4ed8] font-bold underline hover:text-[#1e40af]"
                      >
                        {t("ratePage.viewAllGuidelines") || "Xem toàn bộ quy chuẩn"} →
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
                    t("ratePage.reviewPlaceholder") ||
                    "Bạn muốn chia sẻ điều gì với các bạn sinh viên khóa sau về thầy/cô này?"
                  }
                  className="w-full p-3.5 text-sm bg-white border border-gray-200 outline-none focus:outline-none focus:border-[#1d4ed8] font-mono text-black leading-relaxed"
                />
                <div className="flex items-center justify-between text-xs font-mono text-gray-500">
                  <span>
                    {reviewComment.length < 25 && (
                      <span className="text-[#1d4ed8] font-bold">
                        {t("ratePage.minCharNotice", { current: reviewComment.length }) ||
                          `Tối thiểu 25 ký tự (${reviewComment.length}/350)`}
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
                  {t("ratePage.cohortLabel") || (locale === "vi" ? "Niên khóa / Tên hiển thị (Tùy chọn)" : "Student Cohort / Display Name (Optional)")}
                </label>
                <input
                  type="text"
                  value={cohortName}
                  onChange={(e) => setCohortName(e.target.value)}
                  placeholder={t("ratePage.cohortPlaceholder") || "Niên khóa / Chuyên ngành..."}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 outline-none focus:outline-none focus:border-[#1d4ed8] font-mono font-bold text-black"
                />
              </div>
            </div>

            {/* Disclaimer & Submit Button */}
            <div className="space-y-4 pt-2 text-center sm:text-left">
              <p className="text-[11px] font-mono text-gray-600 leading-normal">
                {t("ratePage.disclaimer") ||
                  "Bằng việc nhấn nút \"Gửi đánh giá\", tôi xác nhận đã đọc và đồng ý với Quy chuẩn cộng đồng và Chính sách bảo mật."}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* BUG-11: Submit button is not disabled during submission, allowing duplicate reviews on double click */}
                <button
                  type="submit"
                  className="w-full sm:w-auto px-10 py-3.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-mono font-bold uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
                >
                  {isEditMode
                    ? t("ratePage.updateButton") || "Cập nhật đánh giá"
                    : t("ratePage.submitButton") || "Gửi đánh giá"}
                </button>

                {isEditMode && (
                  <button
                    type="button"
                    disabled={submitting || isDeleting}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full sm:w-auto px-6 py-3.5 bg-gray-50 hover:bg-gray-100 text-slate-700 text-sm font-mono font-bold uppercase tracking-wider border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <PopArtTrash className="w-4 h-4 text-slate-600" />
                    <span>{t("ratePage.deleteButton") || "Xóa đánh giá"}</span>
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
                {t("ratePage.deleteConfirmTitle") || "Xóa đánh giá này?"}
              </h3>
              <p className="text-xs font-mono text-gray-700 leading-relaxed">
                {t("ratePage.deleteConfirmDesc") ||
                  "Bạn có chắc chắn muốn xóa đánh giá của mình? Hành động này sẽ gỡ bỏ nhận xét và tính toán lại điểm tổng hợp của giảng viên."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-gray-50 text-black font-mono font-bold text-xs uppercase tracking-wider border border-gray-200 transition-colors cursor-pointer"
              >
                {t("ratePage.cancel") || (locale === "vi" ? "Hủy" : "Cancel")}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#1d4ed8] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting
                  ? t("ratePage.deleting") || "Đang xóa..."
                  : t("ratePage.confirmDelete") || "Xác nhận xóa"}
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
