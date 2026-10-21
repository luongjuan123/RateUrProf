"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/locales/i18n";
import { usePathname, useRouter } from "next/navigation";
import {
  getBookmarks,
  toggleBookmark,
  refreshBookmarksFromServer,
  BOOKMARKS_CHANGED_EVENT,
} from "@/lib/bookmarks";
import { getUserReviews, getUserSchoolReviews, deleteReview, deleteSchoolReview, getProfessors, getProfessorById, getUniversities } from "@/lib/dataService";
import { Review, SchoolReview, Professor, University } from "@/types";
import { getRatingLevel, getDifficultyLevelByValue } from "@/lib/ratingLevels";
import { ScoreSquare } from "@/components/ScoreSquare";
import { AuthModal } from "@/components/AuthModal";
import { AlertModal } from "@/components/AlertModal";
import {
  PopArtPencil,
  PopArtCheck,
  PopArtX,
  PopArtStar,
  PopArtBookmark,
  PopArtExternalLink,
  PopArtLogOut,
  PopArtShield,
  PopArtTrash,
  PopArtLock,
  PopArtLogIn,
  PopArtAlertTriangle,
  PopArtChevronRight,
  PopArtBuilding,
  PopArtUser,
  PopArtAward,
  PopArtGraduationCap,
} from "@/components/icons/PopArtIcons";

type TabType = "profile" | "settings" | "ratings" | "school-ratings" | "saved-professors";

export function AccountClient({ initialTab = "profile" }: { initialTab?: TabType }) {
  const { user, userProfile, logOut, updateUserProfile, loading, signInWithGoogle } = useAuth();
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsNoticeOpen, setIsSettingsNoticeOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [school, setSchool] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [expectedGraduationYear, setExpectedGraduationYear] = useState("");

  // Data states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [schoolReviews, setSchoolReviews] = useState<SchoolReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string; type: "professor" | "school" } | null>(null);
  const [savedProfIds, setSavedProfIds] = useState<string[]>([]);
  const [savedProfessors, setSavedProfessors] = useState<Professor[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Account deletion states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  // Sync profile data to form
  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || "");
      setLastName(userProfile.lastName || "");
      setSchool(userProfile.school || userProfile.university || "");
      setFieldOfStudy(userProfile.fieldOfStudy || "");
      setExpectedGraduationYear(
        userProfile.expectedGraduationYear ? String(userProfile.expectedGraduationYear) : ""
      );
    }
  }, [userProfile]);

  // Sync activeTab with pathname
  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean);
    const lastSeg = segments[segments.length - 1];
    if (lastSeg === "settings" || lastSeg === "ratings" || lastSeg === "school-ratings" || lastSeg === "saved-professors" || lastSeg === "profile") {
      setActiveTab(lastSeg as TabType);
    }
  }, [pathname]);

  // Fetch reviews when Ratings or School Ratings tab is active
  useEffect(() => {
    if (activeTab === "ratings") {
      if (!user) {
        setReviews([]);
        return;
      }
      setLoadingReviews(true);
      getUserReviews(user.uid)
        .then((profRevs) => {
          setReviews(profRevs);
        })
        .catch((err) => console.error("Error fetching reviews:", err))
        .finally(() => setLoadingReviews(false));
    } else if (activeTab === "school-ratings") {
      if (!user) {
        setSchoolReviews([]);
        return;
      }
      setLoadingReviews(true);
      getUserSchoolReviews(user.uid)
        .then((uniRevs) => {
          setSchoolReviews(uniRevs);
        })
        .catch((err) => console.error("Error fetching school reviews:", err))
        .finally(() => setLoadingReviews(false));
    }
  }, [activeTab, user]);

  // Fetch bookmarks & full professor objects when Saved tab is active
  useEffect(() => {
    if (activeTab === "saved-professors") {
      const loadSaved = async () => {
        setLoadingSaved(true);
        try {
          const bmarks = user?.uid
            ? await refreshBookmarksFromServer(user.uid)
            : getBookmarks();
          setSavedProfIds(bmarks);

          if (bmarks.length === 0) {
            setSavedProfessors([]);
            setLoadingSaved(false);
            return;
          }

          const results = await Promise.all(bmarks.map((id) => getProfessorById(id)));
          const list = bmarks.map((id, idx) => {
            const found = results[idx];
            if (found) return found;
            return {
              id,
              name: id,
              fullName: id,
              universityId: "",
              universityName: locale === "en" ? "University" : "Đại học",
            } as Professor;
          });
          setSavedProfessors(list);
        } catch (err) {
          console.error("Error loading saved professors:", err);
        } finally {
          setLoadingSaved(false);
        }
      };

      loadSaved();
    }
  }, [activeTab, locale, user]);

  // Load universities list for school selection
  useEffect(() => {
    getUniversities().then((unis) => setUniversities(unis)).catch(() => {});
  }, []);

  // Listen to bookmark changes across tabs
  useEffect(() => {
    const handleBookmarkChange = () => {
      const bmarks = getBookmarks(user?.uid);
      setSavedProfIds(bmarks);
      setSavedProfessors((prev) => prev.filter((p) => bmarks.includes(p.id)));
    };
    window.addEventListener(BOOKMARKS_CHANGED_EVENT, handleBookmarkChange);
    return () => window.removeEventListener(BOOKMARKS_CHANGED_EVENT, handleBookmarkChange);
  }, [user?.uid]);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/${locale}/account/${tab}`);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        school: school.trim() || undefined,
        fieldOfStudy: fieldOfStudy.trim() || undefined,
        expectedGraduationYear: expectedGraduationYear.trim() || undefined,
        displayName: firstName.trim() && lastName.trim()
          ? `${firstName.trim()} ${lastName.trim()}`
          : firstName.trim() || userProfile?.displayName || undefined,
      });
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Save profile error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (userProfile) {
      setFirstName(userProfile.firstName || "");
      setLastName(userProfile.lastName || "");
      setSchool(userProfile.school || userProfile.university || "");
      setFieldOfStudy(userProfile.fieldOfStudy || "");
      setExpectedGraduationYear(
        userProfile.expectedGraduationYear ? String(userProfile.expectedGraduationYear) : ""
      );
    }
    setIsEditing(false);
  };

  const handleRemoveBookmark = (profId: string) => {
    toggleBookmark(profId, user?.uid);
    setSavedProfIds(getBookmarks(user?.uid));
    setSavedProfessors((prev) => prev.filter((p) => p.id !== profId));
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    const { id, type } = deleteConfirmTarget;
    setDeletingId(id);
    try {
      if (type === "professor") {
        const ok = await deleteReview(id);
        if (ok) {
          setReviews((prev) => prev.filter((r) => r.id !== id));
        }
      } else {
        const ok = await deleteSchoolReview(id);
        if (ok) {
          setSchoolReviews((prev) => prev.filter((r) => r.id !== id));
        }
      }
    } catch (err) {
      console.error("Error deleting review:", err);
    } finally {
      setDeletingId(null);
      setDeleteConfirmTarget(null);
    }
  };

  const handleRequestAccountDeletion = async () => {
    setDeletingAccount(true);
    setDeleteAccountError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deletionReason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteAccountError(
          data.error || (locale === "vi" ? "Có lỗi xảy ra khi yêu cầu xóa tài khoản." : "Failed to delete account.")
        );
        setDeletingAccount(false);
        return;
      }
      setIsDeleteDialogOpen(false);
      alert(
        locale === "vi"
          ? "Yêu cầu xóa tài khoản đã được tiếp nhận. Chúng tôi đã gửi email chứa liên kết khôi phục 14 ngày tới bạn."
          : "Account deletion requested. A 14-day recovery link has been sent to your email."
      );
      await logOut();
      router.push(`/${locale}`);
    } catch {
      setDeleteAccountError(locale === "vi" ? "Không thể kết nối đến máy chủ." : "Could not reach server.");
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-black border-t-transparent animate-spin mx-auto rounded-none" />
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500">
          {t("account.loading") || "Đang tải..."}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-white">
        <div className="w-full max-w-lg bg-white border-3 border-black p-8 shadow-[8px_8px_0px_#000] space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#fee2e2] border-2 border-black shadow-[3px_3px_0px_#000] text-black mx-auto">
            <PopArtLock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-[#fef9c3] border-2 border-black font-mono font-black text-[11px] uppercase tracking-wider shadow-[2px_2px_0px_#000]">
              {t("account.accountSecurity") || "Bảo mật & Tài khoản"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-mono font-black text-black tracking-tight uppercase">
              {t("account.signInRequired") || "Cần đăng nhập"}
            </h1>
            <p className="text-xs sm:text-sm font-mono text-gray-700 max-w-md mx-auto leading-relaxed">
              {t("account.signInPrompt") ||
                "Vui lòng đăng nhập bằng tài khoản Google để truy cập bảng điều khiển tài khoản và quản lý hồ sơ của bạn."}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => signInWithGoogle(pathname)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#e03a3e] hover:bg-[#b91c1c] text-white font-mono font-black text-xs uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
              <PopArtLogIn className="w-4 h-4" />
              <span>{t("nav.signIn") || "Đăng nhập với Google"}</span>
            </button>

            <Link
              href={`/${locale}`}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 bg-white hover:bg-gray-100 text-black font-mono font-black text-xs uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
              {locale === "vi" ? "Trang chủ" : "Home"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Header display name computation from authenticated user profile
  const greetingName =
    userProfile?.firstName
      ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim().toLowerCase()
      : userProfile?.displayName
      ? userProfile.displayName.toLowerCase()
      : user.email
      ? user.email.split("@")[0].toLowerCase()
      : "sinh viên";

  return (
    <div className="min-h-screen bg-white">
      {/* Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        {/* Clean Neo-Brutalist Account Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b-2 border-black pb-4">
          <div>
            <div className="inline-block px-2 py-0.5 bg-black text-white font-mono font-black text-[10px] uppercase tracking-wider mb-1.5 shadow-[1px_1px_0px_#000]">
              ★ {locale === "vi" ? "BẢNG ĐIỀU KHIỂN CÁ NHÂN" : "STUDENT PORTAL"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight uppercase">
              {locale === "vi" ? `Xin chào, ${greetingName}!` : `Hello, ${greetingName}!`}
            </h1>
            <p className="text-xs text-gray-600 font-semibold mt-1">
              {locale === "vi"
                ? "Quản lý thông tin hồ sơ, theo dõi các đánh giá đã gửi và danh sách giảng viên đã lưu."
                : "Manage your profile, track submitted reviews, and view saved professors."}
            </p>
          </div>
        </div>

        {/* Tab Navigation Bar - Neo-Brutalist Pill Tabs in ONE SINGLE LINE */}
        <div className="mb-8">
          <nav
            className="flex flex-nowrap items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
            aria-label="Tabs"
          >
            {[
              { id: "profile" as TabType, label: t("account.profile") || "Hồ sơ cá nhân", icon: PopArtUser },
              { id: "settings" as TabType, label: t("account.settings") || "Cài đặt tài khoản", icon: PopArtShield },
              { id: "ratings" as TabType, label: t("account.professorRatings") || "Đánh giá GV", icon: PopArtStar },
              { id: "school-ratings" as TabType, label: t("account.schoolRatings") || "Đánh giá Trường", icon: PopArtBuilding },
              { id: "saved-professors" as TabType, label: t("account.savedProfessors") || "GV đã lưu", icon: PopArtBookmark },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs font-mono font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    isActive
                      ? "bg-[#fef9c3] text-black shadow-[3px_3px_0px_#000] -translate-x-0.5 -translate-y-0.5"
                      : "bg-white text-gray-700 hover:bg-gray-100 shadow-[1px_1px_0px_#000]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" filled={isActive && tab.id === "ratings"} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB 1: PROFILE */}
        {activeTab === "profile" && (
          <div className="bg-white border-2 border-black p-6 sm:p-8 shadow-[6px_6px_0px_#000] space-y-6">
            {/* Header + Edit Button */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-black">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#fef9c3] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
                  <PopArtUser className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-mono font-black uppercase tracking-tight text-black">
                    {locale === "vi" ? "Thông tin sinh viên" : "Student Information"}
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-gray-500">
                    {locale === "vi" ? "Thông tin dùng để cá nhân hóa trải nghiệm" : "Used to personalize your review experience"}
                  </p>
                </div>
              </div>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-1.5 bg-[#fef9c3] hover:bg-yellow-200 text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer group"
                >
                  <PopArtPencil className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                  <span>{t("account.edit") || "Chỉnh sửa"}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelEdit}
                    type="button"
                    className="px-3.5 py-1.5 text-xs font-mono font-black uppercase tracking-wider text-black bg-white hover:bg-gray-100 border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                  >
                    {t("account.cancel") || "Hủy"}
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    type="button"
                    className="px-4 py-1.5 text-xs font-mono font-black uppercase tracking-wider text-black bg-[#4ade80] hover:bg-green-400 border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer flex items-center gap-1"
                  >
                    <PopArtCheck className="w-3.5 h-3.5" />
                    <span>{saving ? (locale === "vi" ? "Đang lưu..." : "Saving...") : (t("account.save") || "Lưu")}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Notification Banner */}
            {saveSuccess && (
              <div className="p-3 bg-[#6ee7b7]/30 border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 text-xs font-bold text-black">
                <PopArtCheck className="w-4 h-4" />
                <span>{locale === "vi" ? "Cập nhật hồ sơ thành công!" : "Profile updated successfully!"}</span>
              </div>
            )}

            {/* Profile Fields List */}
            {!isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* First Name */}
                <div className="p-4 bg-white border-2 border-black shadow-[3px_3px_0px_#000] flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#fef9c3] border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0">
                    <PopArtUser className="w-4 h-4 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-gray-500 block">
                      {t("account.firstName") || "Tên"}
                    </span>
                    <span className="text-sm font-mono font-black text-black break-words">
                      {firstName || <span className="text-gray-400 italic font-normal text-xs">{locale === "vi" ? "Chưa cung cấp" : "Not provided"}</span>}
                    </span>
                  </div>
                </div>

                {/* Last Name */}
                <div className="p-4 bg-white border-2 border-black shadow-[3px_3px_0px_#000] flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#fef9c3] border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0">
                    <PopArtUser className="w-4 h-4 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-gray-500 block">
                      {t("account.lastName") || "Họ & Tên đệm"}
                    </span>
                    <span className="text-sm font-mono font-black text-black break-words">
                      {lastName || <span className="text-gray-400 italic font-normal text-xs">{locale === "vi" ? "Chưa cung cấp" : "Not provided"}</span>}
                    </span>
                  </div>
                </div>

                {/* School */}
                <div className="p-4 bg-white border-2 border-black shadow-[3px_3px_0px_#000] flex items-start gap-3 md:col-span-2">
                  <div className="w-9 h-9 bg-[#e0f2fe] border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0">
                    <PopArtBuilding className="w-4 h-4 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-gray-500 block">
                      {t("account.school") || "Trường Đại học"}
                    </span>
                    <span className="text-sm font-mono font-black text-black break-words">
                      {school || <span className="text-gray-400 italic font-normal text-xs">{locale === "vi" ? "Chưa cung cấp" : "Not provided"}</span>}
                    </span>
                  </div>
                </div>

                {/* Field of Study */}
                <div className="p-4 bg-white border-2 border-black shadow-[3px_3px_0px_#000] flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#dcfce7] border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0">
                    <PopArtAward className="w-4 h-4 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-gray-500 block">
                      {t("account.fieldOfStudy") || "Ngành học"}
                    </span>
                    <span className="text-sm font-mono font-black text-black break-words">
                      {fieldOfStudy || <span className="text-gray-400 italic font-normal text-xs">{locale === "vi" ? "Chưa cung cấp" : "Not provided"}</span>}
                    </span>
                  </div>
                </div>

                {/* Expected Year of Graduation */}
                <div className="p-4 bg-white border-2 border-black shadow-[3px_3px_0px_#000] flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#ede9fe] border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0">
                    <PopArtGraduationCap className="w-4 h-4 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-gray-500 block">
                      {t("account.expectedGraduationYear") || "Năm tốt nghiệp dự kiến"}
                    </span>
                    <span className="text-sm font-mono font-black text-black">
                      {expectedGraduationYear || <span className="text-gray-400 italic font-normal text-xs">{locale === "vi" ? "Chưa cung cấp" : "Not provided"}</span>}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Form with strict zero inner-focus-ring rules */
              <form onSubmit={handleSaveProfile} className="space-y-5 pt-2">
                {/* First Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                    {t("account.firstName") || "First Name"}
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium border-2 border-black bg-white rounded-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] transition-all"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                    {t("account.lastName") || "Last Name"}
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium border-2 border-black bg-white rounded-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] transition-all"
                  />
                </div>

                {/* School */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                    {t("account.school") || "School"}
                  </label>
                  <input
                    type="text"
                    list="university-list"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium border-2 border-black bg-white rounded-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] transition-all"
                  />
                  <datalist id="university-list">
                    {universities.map((u) => (
                      <option key={u.id} value={u.name} />
                    ))}
                  </datalist>
                </div>

                {/* Field of Study */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                    {t("account.fieldOfStudy") || "Field of Study"}
                  </label>
                  <input
                    type="text"
                    value={fieldOfStudy}
                    onChange={(e) => setFieldOfStudy(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium border-2 border-black bg-white rounded-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] transition-all"
                  />
                </div>

                {/* Expected Year of Graduation */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                    {t("account.expectedGraduationYear") || "Expected Year of Graduation"}
                  </label>
                  <input
                    type="number"
                    min="1990"
                    max="2040"
                    value={expectedGraduationYear}
                    onChange={(e) => setExpectedGraduationYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-medium border-2 border-black bg-white rounded-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] transition-all"
                  />
                </div>

                {/* Bottom Submit Buttons */}
                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-[#fef9c3] hover:bg-yellow-200 text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                  >
                    {saving ? (locale === "vi" ? "Đang lưu..." : "Saving...") : (locale === "vi" ? "Lưu thay đổi" : "Save Changes")}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-5 py-2.5 bg-white hover:bg-gray-100 text-black font-bold text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                  >
                    {t("account.cancel") || "Cancel"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: ACCOUNT SETTINGS */}
        {activeTab === "settings" && (
          <div className="bg-white border-2 border-black p-6 sm:p-8 shadow-[6px_6px_0px_#000] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b-2 border-black">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#e0f2fe] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
                  <PopArtShield className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-mono font-black uppercase tracking-tight text-black">
                    {locale === "vi" ? "Cài đặt & Bảo mật" : "Account Settings & Security"}
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-gray-500">
                    {locale === "vi" ? "Quản lý thông tin đăng nhập và quyền riêng tư" : "Manage credentials and account privacy"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsSettingsNoticeOpen(true)}
                className="px-3.5 py-1.5 bg-[#fef9c3] hover:bg-yellow-200 text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer group"
              >
                <PopArtPencil className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                <span>{t("account.edit") || "Chỉnh sửa"}</span>
              </button>
            </div>

            <div className="space-y-5 pt-2">
              {/* Email & Password Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div className="p-4 bg-white border-2 border-black shadow-[3px_3px_0px_#000] flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#fef9c3] border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0">
                    <PopArtUser className="w-4 h-4 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-gray-500 block">
                      {t("account.email") || "Email liên kết"}
                    </span>
                    <span className="text-sm font-mono font-black text-black break-all">
                      {user?.email || "user@example.com"}
                    </span>
                  </div>
                </div>

                {/* Password */}
                <div className="p-4 bg-white border-2 border-black shadow-[3px_3px_0px_#000] flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#fed7aa] border-2 border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0">
                    <PopArtLock className="w-4 h-4 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-gray-500 block">
                      Mật khẩu
                    </span>
                    <span className="text-sm font-mono font-black text-gray-800 tracking-widest">
                      ••••••••
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Box */}
              <div className="p-4 bg-[#e0f2fe] border-2 border-black shadow-[3px_3px_0px_#000]">
                <div className="flex items-center gap-2 mb-1.5">
                  <PopArtShield className="w-4 h-4 text-black" />
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-black">
                    {t("account.accountSecurity") || "Bảo mật tài khoản"}
                  </span>
                </div>
                <p className="text-xs font-mono font-bold text-gray-700 leading-relaxed">
                  {t("account.securityInfo") ||
                    "Tài khoản của bạn được bảo vệ qua giao thức Google OAuth 2.0 an toàn. Chúng tôi không bao giờ lưu trữ mật khẩu thô trên máy chủ."}
                </p>
              </div>

              {/* Sign Out Action */}
              <div className="pt-4 border-t-2 border-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-mono font-black uppercase tracking-wider text-black">
                    {locale === "vi" ? "Đăng xuất khỏi thiết bị này" : "Sign out from this device"}
                  </h4>
                  <p className="text-[11px] font-mono font-bold text-gray-500">
                    {locale === "vi" ? "Phiên làm việc của bạn sẽ được kết thúc an toàn." : "Your active session will be cleanly terminated."}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await logOut();
                    router.push(`/${locale}`);
                  }}
                  className="px-4 py-2 bg-[#fee2e2] hover:bg-red-200 text-red-900 font-mono font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <PopArtLogOut className="w-3.5 h-3.5" />
                  <span>{t("account.signOut") || "Đăng xuất"}</span>
                </button>
              </div>

              {/* Danger Zone: Account Deletion */}
              <div className="pt-4 border-t-2 border-black space-y-3">
                <div className="flex items-center gap-2">
                  <PopArtAlertTriangle className="w-4 h-4 text-[#e03a3e]" />
                  <h4 className="text-xs font-mono font-black uppercase tracking-wider text-[#e03a3e]">
                    {locale === "vi" ? "Vùng nguy hiểm: Yêu cầu xóa tài khoản" : "Danger Zone: Request Account Deletion"}
                  </h4>
                </div>
                <div className="p-4 bg-[#fee2e2]/60 border-2 border-black shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-mono font-black uppercase tracking-wider text-black">
                      {locale === "vi" ? "Thời gian ân hạn 14 ngày & Khôi phục qua Email" : "14-Day Grace Period & Email Recovery"}
                    </p>
                    <p className="text-xs font-mono text-gray-700 leading-relaxed max-w-xl">
                      {locale === "vi"
                        ? "Khi bạn yêu cầu xóa tài khoản, tất cả bài đánh giá của bạn sẽ được ẩn ngay lập tức. Chúng tôi sẽ gửi email chứa liên kết khôi phục có hiệu lực trong 14 ngày. Sau 14 ngày, toàn bộ dữ liệu sẽ bị xóa vĩnh viễn."
                        : "When requesting deletion, all your reviews are immediately hidden. We will send an email containing a recovery link valid for 14 days. After 14 days, your account is permanently purged."}
                    </p>
                  </div>
                  {user?.email?.toLowerCase() === "dungpubgame@gmail.com" ? (
                    <div className="px-3 py-1.5 bg-gray-200 border-2 border-black text-[11px] font-mono font-black text-gray-700">
                      {locale === "vi" ? "Tài khoản Super Admin không thể xóa" : "Super Admin protected"}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setDeleteAccountError(null);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="px-4 py-2 bg-[#e03a3e] hover:bg-[#c92f33] text-white font-mono font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all shrink-0 cursor-pointer"
                    >
                      {locale === "vi" ? "Yêu cầu xóa tài khoản" : "Request Deletion"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROFESSOR RATINGS */}
        {activeTab === "ratings" && (
          <div className="py-10">
            {loadingReviews ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin mx-auto" />
                <p className="text-xs font-mono font-bold text-gray-500 uppercase tracking-wider">
                  {t("account.loading") || "Loading reviews..."}
                </p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-10 space-y-4 max-w-lg mx-auto">
                <div className="relative w-36 h-28 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 bg-[#fef08a] transform rotate-3 border-2 border-black shadow-[3px_3px_0px_#000]" />
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 bg-white border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center mb-1">
                      <PopArtStar className="w-6 h-6" filled={true} />
                    </div>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-mono font-black text-black tracking-tight pt-2 uppercase">
                  {locale === "vi"
                    ? "Bạn chưa đánh giá giảng viên nào"
                    : "You haven't rated any professors yet"}
                </h2>
                <div className="pt-2">
                  <Link
                    href={`/${locale}/professors`}
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-[#fef9c3] hover:bg-yellow-200 text-black font-mono font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                  >
                    {locale === "vi" ? "Tìm giảng viên" : "Find a Professor"}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-black">
                    {locale === "vi"
                      ? `Đánh giá giảng viên (${reviews.length})`
                      : `Professor Ratings (${reviews.length})`}
                  </span>
                  <Link
                    href={`/${locale}/professors`}
                    className="text-xs font-mono font-bold text-[#e03a3e] hover:underline"
                  >
                    + {locale === "vi" ? "Viết đánh giá giảng viên mới" : "Write a professor review"}
                  </Link>
                </div>

                {/* Professor Reviews List */}
                <div className="space-y-4">
                  {reviews.map((rev) => {
                    const level = getRatingLevel(rev.overallRating);
                    return (
                      <div
                        key={rev.id}
                        className="p-5 bg-white border-2 border-black border-l-8 shadow-[3px_3px_0px_#000] space-y-3 hover:shadow-[5px_5px_0px_#000] transition-all"
                        style={{ borderLeftColor: level.color }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              href={`/${locale}/professors/${rev.professorId}`}
                              className="text-base font-black text-black hover:text-[#e03a3e] transition-colors flex items-center gap-1.5"
                            >
                              <span>{rev.professorName}</span>
                              <PopArtExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <p className="text-xs font-bold text-gray-700 mt-0.5">
                              {rev.courseName} • {new Date(rev.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div
                              className="flex items-center gap-1.5 px-2.5 py-1 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]"
                              style={{ backgroundColor: level.color }}
                            >
                              <span className="text-[10px] font-mono font-black uppercase">
                                {locale === "vi" ? level.labelVi : level.labelEn}
                              </span>
                              <span className="text-xs font-mono font-black">{rev.overallRating.toFixed(1)}</span>
                            </div>

                            {(() => {
                              const diffVal = rev.criteria?.difficulty ?? 3;
                              const diffLevel = getDifficultyLevelByValue(diffVal);
                              return (
                                <div
                                  className="flex items-center gap-1 px-2 py-1 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]"
                                  style={{ backgroundColor: diffLevel.color }}
                                >
                                  <span className="text-[9px] font-mono font-black uppercase">
                                    {locale === "vi" ? "Độ khó" : "Diff"}
                                  </span>
                                  <span className="text-xs font-mono font-black">{diffVal.toFixed(1)}</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <p className="text-sm text-gray-800 leading-relaxed">
                          {rev.comment}
                        </p>

                        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 font-medium">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const diffVal = rev.criteria?.difficulty ?? 3;
                              const diffLevel = getDifficultyLevelByValue(diffVal);
                              return (
                                <span
                                  className="px-2 py-0.5 border border-black shadow-[1px_1px_0px_#000] font-bold"
                                  style={{ backgroundColor: diffLevel.lightBg, color: diffLevel.textColor }}
                                >
                                  {locale === "vi" ? "Độ khó:" : "Difficulty:"}{" "}
                                  <span className="font-black text-black">{diffVal}/5</span>{" "}
                                  <span className="text-[11px] font-bold opacity-90">({locale === "vi" ? diffLevel.labelVi : diffLevel.labelEn})</span>
                                </span>
                              );
                            })()}
                            {rev.takeAgain !== undefined && rev.takeAgain !== null && (
                              <span
                                className={`px-2 py-0.5 border border-black shadow-[1px_1px_0px_#000] font-bold ${
                                  rev.takeAgain
                                    ? "bg-[#6ee7b7] text-black"
                                    : "bg-[#fee2e2] text-black"
                                }`}
                              >
                                {rev.takeAgain
                                  ? (locale === "vi" ? "Sẵn sàng học lại" : "Would take again")
                                  : (locale === "vi" ? "Không sẵn sàng học lại" : "Would not take again")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/${locale}/professors/${rev.professorId}/rate`}
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#fef9c3] hover:bg-[#fde047] text-black border border-black text-xs font-mono font-bold shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                            >
                              <PopArtPencil className="w-3.5 h-3.5" />
                              <span>{locale === "vi" ? "Sửa" : "Edit"}</span>
                            </Link>
                            <button
                              onClick={() => setDeleteConfirmTarget({ id: rev.id, name: rev.professorName || "Giảng viên", type: "professor" })}
                              disabled={deletingId === rev.id}
                              className="flex items-center gap-1 text-black bg-[#fee2e2] hover:bg-red-200 border border-black px-2.5 py-1 text-xs font-mono font-bold shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                            >
                              <PopArtTrash className="w-3.5 h-3.5" />
                              <span>{locale === "vi" ? "Xóa" : "Delete"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SCHOOL RATINGS */}
        {activeTab === "school-ratings" && (
          <div className="py-10">
            {loadingReviews ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin mx-auto" />
                <p className="text-xs font-mono font-bold text-gray-500 uppercase tracking-wider">
                  {t("account.loading") || "Loading reviews..."}
                </p>
              </div>
            ) : schoolReviews.length === 0 ? (
              <div className="text-center py-10 space-y-4 max-w-lg mx-auto">
                <div className="relative w-36 h-28 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 bg-[#fed7aa] transform -rotate-3 border-2 border-black shadow-[3px_3px_0px_#000]" />
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 bg-white border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center mb-1">
                      <PopArtBuilding className="w-6 h-6 text-black" />
                    </div>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-mono font-black text-black tracking-tight pt-2 uppercase">
                  {locale === "vi"
                    ? "Bạn chưa đánh giá trường đại học nào"
                    : "You haven't rated any universities yet"}
                </h2>
                <div className="pt-2">
                  <Link
                    href={`/${locale}/universities`}
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-[#fef9c3] hover:bg-yellow-200 text-black font-mono font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                  >
                    {locale === "vi" ? "Tìm trường đại học" : "Find a University"}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-black">
                    {locale === "vi"
                      ? `Đánh giá trường đại học (${schoolReviews.length})`
                      : `University Ratings (${schoolReviews.length})`}
                  </span>
                  <Link
                    href={`/${locale}/universities`}
                    className="text-xs font-mono font-bold text-[#e03a3e] hover:underline"
                  >
                    + {locale === "vi" ? "Viết đánh giá trường mới" : "Write a school review"}
                  </Link>
                </div>

                {/* School Reviews List */}
                <div className="space-y-4">
                  {schoolReviews.map((sRev) => {
                    const vals = Object.values(sRev.criteria || {}) as number[];
                    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 3;
                    const level = getRatingLevel(avg);
                    return (
                      <div
                        key={sRev.id}
                        className="p-5 bg-white border-2 border-black border-l-8 shadow-[3px_3px_0px_#000] space-y-3 hover:shadow-[5px_5px_0px_#000] transition-all"
                        style={{ borderLeftColor: level.color }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              href={`/${locale}/universities/${sRev.universityId}`}
                              className="text-base font-black text-black hover:text-[#e03a3e] transition-colors flex items-center gap-1.5"
                            >
                              <span>{sRev.universityName || sRev.universityId}</span>
                              <PopArtExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <p className="text-xs font-bold text-gray-700 mt-0.5">
                              {sRev.cohort ? `${sRev.cohort} • ` : ""}
                              {new Date(sRev.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                            </p>
                          </div>

                          <div
                            className="flex items-center gap-1.5 px-2.5 py-1 text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]"
                            style={{ backgroundColor: level.color }}
                          >
                            <span className="text-[10px] font-mono font-black uppercase">
                              {locale === "vi" ? level.labelVi : level.labelEn}
                            </span>
                            <span className="text-xs font-mono font-black">{avg.toFixed(1)}</span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-800 leading-relaxed">
                          {sRev.comment}
                        </p>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                          <span>{locale === "vi" ? "10 tiêu chí đánh giá" : "10 evaluated criteria"}</span>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/${locale}/universities/${sRev.universityId}/rate`}
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#fef9c3] hover:bg-[#fde047] text-black border border-black text-xs font-mono font-bold shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                            >
                              <PopArtPencil className="w-3 h-3" />
                              <span>{locale === "vi" ? "Sửa" : "Edit"}</span>
                            </Link>
                            <button
                              onClick={() => setDeleteConfirmTarget({ id: sRev.id, name: sRev.universityName || "Trường", type: "school" })}
                              disabled={deletingId === sRev.id}
                              className="flex items-center gap-1 text-black bg-[#fee2e2] hover:bg-red-200 border border-black px-2.5 py-1 text-xs font-mono font-bold shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                            >
                              <PopArtTrash className="w-3 h-3" />
                              <span>{locale === "vi" ? "Xóa" : "Delete"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SAVED PROFESSORS */}
        {activeTab === "saved-professors" && (
          <div className="py-8">
            {loadingSaved ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin mx-auto" />
                <p className="text-xs font-mono font-bold text-gray-500 uppercase tracking-wider">
                  {t("account.loading") || "Loading saved professors..."}
                </p>
              </div>
            ) : savedProfIds.length === 0 ? (
              <div className="text-center py-10 space-y-4 max-w-lg mx-auto">
                <div className="relative w-36 h-28 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 bg-[#fef08a] transform -rotate-3 border-2 border-black shadow-[3px_3px_0px_#000]" />
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-12 h-12 bg-white border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center mb-1">
                      <PopArtBookmark className="w-7 h-7" filled={true} />
                    </div>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-mono font-black text-black tracking-tight pt-2 uppercase">
                  {locale === "vi"
                    ? "Bạn chưa lưu giảng viên nào"
                    : "You haven't saved any professors yet"}
                </h2>
                <div className="pt-2">
                  <Link
                    href={`/${locale}/professors`}
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-[#fef9c3] hover:bg-yellow-200 text-black font-mono font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                  >
                    {locale === "vi" ? "Khám phá giảng viên" : "Explore Professors"}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-black">
                    {locale === "vi" ? `Giảng viên đã lưu (${savedProfIds.length})` : `Saved Professors (${savedProfIds.length})`}
                  </span>
                  <Link
                    href={`/${locale}`}
                    className="text-xs font-mono font-bold text-[#e03a3e] hover:underline"
                  >
                    + {locale === "vi" ? "Khám phá thêm" : "Discover more"}
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {savedProfessors.map((prof) => {
                    const name = prof.fullName || prof.name || prof.id;
                    const title = prof.academicTitle || prof.title || "";
                    const schoolName =
                      locale === "en"
                        ? prof.universityNameEn || prof.universityName || "University"
                        : prof.universityNameVi || prof.universityName || "Đại học";
                    const schoolShort = prof.universityShortName || "";
                    const dept =
                      locale === "en"
                        ? prof.departmentEn || prof.department || prof.facultyEn || prof.faculty
                        : prof.departmentVi || prof.department || prof.facultyVi || prof.faculty;
                    const avg = prof.ratingAverage ?? prof.averageRating ?? null;
                    const revCount = prof.ratingCount ?? prof.publishedReviewCount ?? 0;
                    const hasReviews = revCount > 0 && typeof avg === "number";
                    const level = hasReviews && typeof avg === "number" ? getRatingLevel(avg) : null;
                    const leftBorderColor = level ? level.color : "#c084fc";

                    return (
                      <div
                        key={prof.id}
                        className="p-4 bg-white border-2 border-black border-l-8 shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] transition-all flex flex-col justify-between"
                        style={{ borderLeftColor: leftBorderColor }}
                      >
                        <div>
                          <div className="flex items-start gap-3 mb-2">
                            {/* Score Square on left */}
                            <div className="shrink-0">
                              <ScoreSquare score={avg} ratingCount={revCount} size="md" />
                            </div>

                            {/* Professor info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Link
                                  href={`/${locale}/professors/${prof.id}`}
                                  className="text-base font-black text-black hover:text-[#e03a3e] transition-colors truncate"
                                >
                                  {title ? `${title} ` : ""}{name}
                                </Link>
                                {schoolShort && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider bg-[#fef9c3] text-black border border-black shadow-[1px_1px_0px_#000] shrink-0">
                                    {schoolShort}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs font-bold text-gray-700 mt-1 truncate">
                                {schoolName}
                              </p>
                              {dept && (
                                <p className="text-xs text-gray-500 font-medium truncate">
                                  {dept}
                                </p>
                              )}

                              <div className="text-[11px] font-bold text-gray-600 mt-1">
                                {hasReviews ? (
                                  locale === "en" ? (
                                    `${revCount} ${revCount === 1 ? "rating" : "ratings"}`
                                  ) : (
                                    `${revCount} đánh giá`
                                  )
                                ) : (
                                  <span className="text-gray-500 uppercase text-[10px]">
                                    {locale === "en" ? "No ratings yet" : "Chưa có đánh giá"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t-2 border-black/10 flex items-center justify-between mt-3">
                          <Link
                            href={`/${locale}/professors/${prof.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#e0f2fe] hover:bg-[#bae6fd] text-black text-xs font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                          >
                            <span>{locale === "vi" ? "Xem hồ sơ" : "View Profile"}</span>
                            <PopArtChevronRight className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => handleRemoveBookmark(prof.id)}
                            className="flex items-center gap-1 text-black bg-[#fee2e2] hover:bg-red-200 border border-black px-2.5 py-1.5 text-xs font-mono font-bold shadow-[1px_1px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                            title={locale === "vi" ? "Bỏ lưu" : "Remove bookmark"}
                          >
                            <PopArtTrash className="w-3.5 h-3.5" />
                            <span>{locale === "vi" ? "Bỏ lưu" : "Remove"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auth Modal for guest sign-in */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Neo-Brutalist Alert Modal for Account Settings */}
      <AlertModal
        isOpen={isSettingsNoticeOpen}
        onClose={() => setIsSettingsNoticeOpen(false)}
        badge={locale === "vi" ? "Bảo mật tài khoản Google" : "Google Account Security"}
        title={locale === "vi" ? "Thông tin đăng nhập" : "Login Credentials"}
        message={
          locale === "vi"
            ? "Tài khoản của bạn được liên kết và bảo vệ an toàn qua Google OAuth 2.0. Để cập nhật địa chỉ email hoặc thay đổi mật khẩu, vui lòng thao tác trực tiếp tại trang Quản lý tài khoản Google."
            : "Your account is authenticated and securely protected via Google OAuth 2.0. To update your email or change your password, please manage it directly on Google Account settings."
        }
        type="info"
        actionText={locale === "vi" ? "Mở Google Account (myaccount.google.com)" : "Open Google Account Settings"}
        actionHref="https://myaccount.google.com"
        confirmText={locale === "vi" ? "Đã hiểu" : "Got it"}
      />

      {/* Alert Modal for Review Deletion */}
      <AlertModal
        isOpen={deleteConfirmTarget !== null}
        onClose={() => setDeleteConfirmTarget(null)}
        badge={locale === "vi" ? "Xác nhận xóa đánh giá" : "Confirm Delete"}
        title={
          deleteConfirmTarget?.type === "professor"
            ? (locale === "vi" ? `Xóa đánh giá giảng viên?` : "Delete Professor Rating?")
            : (locale === "vi" ? `Xóa đánh giá trường?` : "Delete School Rating?")
        }
        message={
          locale === "vi"
            ? `Bạn có chắc chắn muốn xóa vĩnh viễn đánh giá cho "${deleteConfirmTarget?.name || ""}"? Điểm số tổng hợp sẽ được tự động tính toán lại.`
            : `Are you sure you want to permanently delete your rating for "${deleteConfirmTarget?.name || ""}"? The aggregate scores will be recalculated.`
        }
        type="danger"
        confirmText={locale === "vi" ? "Xóa vĩnh viễn" : "Yes, Delete"}
        cancelText={locale === "vi" ? "Hủy bỏ" : "Cancel"}
        onConfirm={handleConfirmDelete}
      />

      {/* Account Deletion Request Modal */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white border-2 border-black shadow-[6px_6px_0px_#000] w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <span className="px-2 py-0.5 bg-[#e03a3e] text-white text-[10px] font-black uppercase tracking-wider border border-black shadow-[1.5px_1.5px_0px_#000]">
                {locale === "vi" ? "CẢNH BÁO QUAN TRỌNG" : "CRITICAL WARNING"}
              </span>
              <button
                disabled={deletingAccount}
                onClick={() => setIsDeleteDialogOpen(false)}
                className="p-1 hover:bg-gray-100 border border-black shadow-[1px_1px_0px_#000] cursor-pointer"
              >
                <PopArtX className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                {locale === "vi" ? "Xác nhận yêu cầu xóa tài khoản?" : "Confirm Account Deletion Request?"}
              </h3>
              <p className="text-xs text-gray-700 mt-2 leading-relaxed font-medium">
                {locale === "vi"
                  ? "Tài khoản của bạn sẽ được lên lịch xóa vĩnh viễn sau 14 ngày. Toàn bộ các bài đánh giá của bạn sẽ được ẩn ngay lập tức khỏi bảng xếp hạng. Bạn sẽ nhận được email hướng dẫn khôi phục trong thời gian ân hạn này."
                  : "Your account will be scheduled for permanent deletion in 14 days. All your reviews will be immediately hidden from public view. You will receive an email with recovery instructions during this grace period."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-900">
                {locale === "vi" ? "Lý do bạn muốn rời đi? (Không bắt buộc)" : "Why are you leaving? (Optional)"}
              </label>
              <textarea
                rows={3}
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder={
                  locale === "vi"
                    ? "Hãy cho chúng tôi biết lý do hoặc góp ý để cải thiện nền tảng..."
                    : "Let us know your reason or feedback to improve the platform..."
                }
                className="w-full px-3 py-2 text-xs font-medium border-2 border-black bg-white rounded-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-[2px_2px_0px_#000] resize-none"
              />
            </div>

            {deleteAccountError && (
              <div className="p-3 bg-[#fee2e2] border-2 border-black text-xs font-bold text-red-900 shadow-[2px_2px_0px_#000]">
                {deleteAccountError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-black font-bold text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                {locale === "vi" ? "Hủy bỏ" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleRequestAccountDeletion}
                className="px-5 py-2 bg-[#e03a3e] hover:bg-[#c92f33] disabled:bg-gray-400 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
              >
                {deletingAccount
                  ? locale === "vi"
                    ? "Đang xử lý..."
                    : "Processing..."
                  : locale === "vi"
                  ? "Xác nhận xóa tài khoản"
                  : "Confirm Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
