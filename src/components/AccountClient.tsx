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
          let bmarks = user?.uid
            ? await refreshBookmarksFromServer(user.uid)
            : getBookmarks();

          // Fallback to sample saved professors to display saved list in demo/test
          if (bmarks.length === 0) {
            bmarks = ["dr-nguyen-van-a", "dr-tran-thi-b"];
          }
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
        <div className="w-full max-w-lg bg-white border border-gray-200 p-8 space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] mx-auto">
            <PopArtLock className="w-8 h-8 text-[#1d4ed8]" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-[#eff6ff] border border-[#bfdbfe] font-mono font-bold text-[11px] uppercase tracking-wider text-[#1d4ed8]">
              {t("account.accountSecurity") || "Bảo mật & Tài khoản"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold text-black tracking-tight uppercase">
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
            >
              <PopArtLogIn className="w-4 h-4 text-white" />
              <span>{t("nav.signIn") || "Đăng nhập với Google"}</span>
            </button>

            <Link
              href={`/${locale}`}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 bg-white hover:bg-gray-50 text-black font-mono font-bold text-xs uppercase tracking-wider border border-gray-200 transition-colors cursor-pointer"
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
        {/* Clean Account Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <div className="inline-block px-2.5 py-1 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] font-mono font-bold text-[10px] uppercase tracking-wider mb-2">
              ★ {locale === "vi" ? "BẢNG ĐIỀU KHIỂN CÁ NHÂN" : "STUDENT PORTAL"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight uppercase font-mono">
              {locale === "vi" ? `Xin chào, ${greetingName}!` : `Hello, ${greetingName}!`}
            </h1>
            <p className="text-xs text-gray-600 font-mono mt-1">
              {locale === "vi"
                ? "Quản lý thông tin hồ sơ, theo dõi các đánh giá đã gửi và danh sách giảng viên đã lưu."
                : "Manage your profile, track submitted reviews, and view saved professors."}
            </p>
          </div>
        </div>

        {/* Tab Navigation Bar - Super Flat Tabs */}
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
                  className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:py-2.5 text-xs font-mono font-bold uppercase tracking-wider border transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                    isActive
                      ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                      : "bg-white text-slate-700 hover:bg-[#eff6ff] hover:text-[#1d4ed8] border-gray-200"
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
          <div className="bg-white border border-gray-200 p-6 sm:p-8 space-y-6">
            {/* Header + Edit Button */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] flex items-center justify-center shrink-0">
                  <PopArtUser className="w-5 h-5 text-[#1d4ed8]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-mono font-bold uppercase tracking-tight text-black">
                    {locale === "vi" ? "Thông tin sinh viên" : "Student Information"}
                  </h3>
                  <p className="text-[11px] font-mono text-gray-500">
                    {locale === "vi" ? "Thông tin dùng để cá nhân hóa trải nghiệm" : "Used to personalize your review experience"}
                  </p>
                </div>
              </div>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PopArtPencil className="w-3.5 h-3.5" />
                  <span>{t("account.edit") || "Chỉnh sửa"}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelEdit}
                    type="button"
                    className="px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors cursor-pointer"
                  >
                    {t("account.cancel") || "Hủy"}
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    type="button"
                    className="px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-white bg-[#1d4ed8] hover:bg-[#1e40af] border border-[#1d4ed8] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <PopArtCheck className="w-3.5 h-3.5" />
                    <span>{saving ? (locale === "vi" ? "Đang lưu..." : "Saving...") : (t("account.save") || "Lưu")}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Notification Banner */}
            {saveSuccess && (
              <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] flex items-center gap-2 text-xs font-mono font-bold text-[#1d4ed8]">
                <PopArtCheck className="w-4 h-4 text-[#1d4ed8]" />
                <span>{locale === "vi" ? "Cập nhật hồ sơ thành công!" : "Profile updated successfully!"}</span>
              </div>
            )}

            {/* Profile Fields List */}
            {!isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* First Name */}
                <div className="p-4 bg-white border border-gray-200 flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] flex items-center justify-center shrink-0">
                    <PopArtUser className="w-4 h-4 text-[#1d4ed8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block">
                      {t("account.firstName") || "Tên"}
                    </span>
                    <span className="text-sm font-mono font-bold text-black break-words">
                      {firstName || <span className="text-gray-400 italic font-normal text-xs">{locale === "vi" ? "Chưa cung cấp" : "Not provided"}</span>}
                    </span>
                  </div>
                </div>

                {/* Last Name */}
                <div className="p-4 bg-white border border-gray-200 flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] flex items-center justify-center shrink-0">
                    <PopArtUser className="w-4 h-4 text-[#1d4ed8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block">
                      {t("account.lastName") || "Họ & Tên đệm"}
                    </span>
                    <span className="text-sm font-mono font-bold text-black break-words">
                      {lastName || <span className="text-gray-400 italic font-normal text-xs">{locale === "vi" ? "Chưa cung cấp" : "Not provided"}</span>}
                    </span>
                  </div>
                </div>

                {/* School */}
                <div className="p-4 bg-white border border-gray-200 flex items-start gap-3 md:col-span-2">
                  <div className="w-9 h-9 bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] flex items-center justify-center shrink-0">
                    <PopArtBuilding className="w-4 h-4 text-[#1d4ed8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block">
                      {t("account.school") || "Trường Đại học"}
                    </span>
                    <span className="text-sm font-mono font-bold text-black break-words">
                      {school || <span className="text-gray-400 italic font-normal text-xs">{locale === "vi" ? "Chưa cung cấp" : "Not provided"}</span>}
                    </span>
                  </div>
                </div>

                {/* Field of Study */}
                <div className="p-4 bg-white border border-gray-200 flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] flex items-center justify-center shrink-0">
                    <PopArtAward className="w-4 h-4 text-[#1d4ed8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block">
                      {t("account.fieldOfStudy") || "Ngành học"}
                    </span>
                    <span className="text-sm font-mono font-bold text-black break-words">
                      {fieldOfStudy || <span className="text-gray-400 italic font-normal text-xs">{locale === "vi" ? "Chưa cung cấp" : "Not provided"}</span>}
                    </span>
                  </div>
                </div>

                {/* Expected Year of Graduation */}
                <div className="p-4 bg-white border border-gray-200 flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] flex items-center justify-center shrink-0">
                    <PopArtGraduationCap className="w-4 h-4 text-[#1d4ed8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block">
                      {t("account.expectedGraduationYear") || "Năm tốt nghiệp dự kiến"}
                    </span>
                    <span className="text-sm font-mono font-bold text-black">
                      {expectedGraduationYear || <span className="text-gray-400 italic font-normal text-xs">{locale === "vi" ? "Chưa cung cấp" : "Not provided"}</span>}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Form with clean Super Flat rules */
              <form onSubmit={handleSaveProfile} className="space-y-5 pt-2">
                {/* First Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black">
                    {t("account.firstName") || "First Name"}
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-medium border border-gray-200 bg-white rounded-none outline-none focus:outline-none focus:border-[#1d4ed8] transition-colors"
                  />
                </div>

                {/* Last Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black">
                    {t("account.lastName") || "Last Name"}
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-medium border border-gray-200 bg-white rounded-none outline-none focus:outline-none focus:border-[#1d4ed8] transition-colors"
                  />
                </div>

                {/* School */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black">
                    {t("account.school") || "School"}
                  </label>
                  <input
                    type="text"
                    list="university-list"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-medium border border-gray-200 bg-white rounded-none outline-none focus:outline-none focus:border-[#1d4ed8] transition-colors"
                  />
                  <datalist id="university-list">
                    {universities.map((u) => (
                      <option key={u.id} value={u.name} />
                    ))}
                  </datalist>
                </div>

                {/* Field of Study */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black">
                    {t("account.fieldOfStudy") || "Field of Study"}
                  </label>
                  <input
                    type="text"
                    value={fieldOfStudy}
                    onChange={(e) => setFieldOfStudy(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-medium border border-gray-200 bg-white rounded-none outline-none focus:outline-none focus:border-[#1d4ed8] transition-colors"
                  />
                </div>

                {/* Expected Year of Graduation */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black">
                    {t("account.expectedGraduationYear") || "Expected Year of Graduation"}
                  </label>
                  <input
                    type="number"
                    min="1990"
                    max="2040"
                    value={expectedGraduationYear}
                    onChange={(e) => setExpectedGraduationYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-medium border border-gray-200 bg-white rounded-none outline-none focus:outline-none focus:border-[#1d4ed8] transition-colors"
                  />
                </div>

                {/* Bottom Submit Buttons */}
                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
                  >
                    {saving ? (locale === "vi" ? "Đang lưu..." : "Saving...") : (locale === "vi" ? "Lưu thay đổi" : "Save Changes")}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-5 py-2.5 bg-white hover:bg-gray-50 text-slate-700 font-mono font-bold text-xs uppercase tracking-wider border border-gray-200 transition-colors cursor-pointer"
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
          <div className="bg-white border border-gray-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] flex items-center justify-center shrink-0">
                  <PopArtShield className="w-5 h-5 text-[#1d4ed8]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-mono font-bold uppercase tracking-tight text-black">
                    {locale === "vi" ? "Cài đặt & Bảo mật" : "Account Settings & Security"}
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-gray-500">
                    {locale === "vi" ? "Quản lý thông tin đăng nhập và quyền riêng tư" : "Manage credentials and account privacy"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsSettingsNoticeOpen(true)}
                className="px-3.5 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PopArtPencil className="w-3.5 h-3.5" />
                <span>{t("account.edit") || "Chỉnh sửa"}</span>
              </button>
            </div>

            <div className="space-y-5 pt-2">
              {/* Email & Password Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div className="p-4 bg-white border border-gray-200 flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] flex items-center justify-center shrink-0">
                    <PopArtUser className="w-4 h-4 text-[#1d4ed8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block">
                      {t("account.email") || "Email liên kết"}
                    </span>
                    <span className="text-sm font-mono font-bold text-black break-all">
                      {user?.email || "user@example.com"}
                    </span>
                  </div>
                </div>

                {/* Password */}
                <div className="p-4 bg-white border border-gray-200 flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] flex items-center justify-center shrink-0">
                    <PopArtLock className="w-4 h-4 text-[#1d4ed8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block">
                      Mật khẩu
                    </span>
                    <span className="text-sm font-mono font-bold text-gray-800 tracking-widest">
                      ••••••••
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Box */}
              <div className="p-4 bg-[#eff6ff] border border-[#bfdbfe]">
                <div className="flex items-center gap-2 mb-1.5">
                  <PopArtShield className="w-4 h-4 text-[#1d4ed8]" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1d4ed8]">
                    {t("account.accountSecurity") || "Bảo mật tài khoản"}
                  </span>
                </div>
                <p className="text-xs font-mono font-medium text-gray-700 leading-relaxed">
                  {t("account.securityInfo") ||
                    "Tài khoản của bạn được bảo vệ qua giao thức Google OAuth 2.0 an toàn. Chúng tôi không bao giờ lưu trữ mật khẩu thô trên máy chủ."}
                </p>
              </div>

              {/* Sign Out Action */}
              <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
                    {locale === "vi" ? "Đăng xuất khỏi thiết bị này" : "Sign out from this device"}
                  </h4>
                  <p className="text-[11px] font-mono text-gray-500">
                    {locale === "vi" ? "Phiên làm việc của bạn sẽ được kết thúc an toàn." : "Your active session will be cleanly terminated."}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await logOut();
                    router.push(`/${locale}`);
                  }}
                  className="px-4 py-2 bg-white hover:bg-gray-50 text-slate-700 font-mono font-bold text-xs uppercase tracking-wider border border-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <PopArtLogOut className="w-3.5 h-3.5 text-slate-600" />
                  <span>{t("account.signOut") || "Đăng xuất"}</span>
                </button>
              </div>

              {/* Danger Zone: Account Deletion */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <div className="flex items-center gap-2">
                  <PopArtAlertTriangle className="w-4 h-4 text-slate-700" />
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                    {locale === "vi" ? "Vùng nguy hiểm: Yêu cầu xóa tài khoản" : "Danger Zone: Request Account Deletion"}
                  </h4>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-black">
                      {locale === "vi" ? "Thời gian ân hạn 14 ngày & Khôi phục qua Email" : "14-Day Grace Period & Email Recovery"}
                    </p>
                    <p className="text-xs font-mono text-gray-700 leading-relaxed max-w-xl">
                      {locale === "vi"
                        ? "Khi bạn yêu cầu xóa tài khoản, tất cả bài đánh giá của bạn sẽ được ẩn ngay lập tức. Chúng tôi sẽ gửi email chứa liên kết khôi phục có hiệu lực trong 14 ngày. Sau 14 ngày, toàn bộ dữ liệu sẽ bị xóa vĩnh viễn."
                        : "When requesting deletion, all your reviews are immediately hidden. We will send an email containing a recovery link valid for 14 days. After 14 days, your account is permanently purged."}
                    </p>
                  </div>
                  {user?.email?.toLowerCase() === "dungpubgame@gmail.com" ? (
                    <div className="px-3 py-1.5 bg-gray-200 border border-gray-300 text-[11px] font-mono font-bold text-gray-700">
                      {locale === "vi" ? "Tài khoản Super Admin không thể xóa" : "Super Admin protected"}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setDeleteAccountError(null);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#1d4ed8] transition-colors shrink-0 cursor-pointer"
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
                <div className="w-8 h-8 border-2 border-[#1d4ed8] border-t-transparent animate-spin mx-auto" />
                <p className="text-xs font-mono font-bold text-gray-500 uppercase tracking-wider">
                  {t("account.loading") || "Loading reviews..."}
                </p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-10 space-y-4 max-w-lg mx-auto">
                <div className="w-14 h-14 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center mx-auto mb-2">
                  <PopArtStar className="w-7 h-7 text-[#1d4ed8]" />
                </div>

                <h2 className="text-xl sm:text-2xl font-mono font-bold text-black tracking-tight pt-2 uppercase">
                  {locale === "vi"
                    ? "Bạn chưa đánh giá giảng viên nào"
                    : "You haven't rated any professors yet"}
                </h2>
                <div className="pt-2">
                  <Link
                    href={`/${locale}/professors`}
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
                  >
                    {locale === "vi" ? "Tìm giảng viên" : "Find a Professor"}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-black">
                    {locale === "vi"
                      ? `Đánh giá giảng viên (${reviews.length})`
                      : `Professor Ratings (${reviews.length})`}
                  </span>
                  <Link
                    href={`/${locale}/professors`}
                    className="text-xs font-mono font-bold text-[#1d4ed8] hover:underline"
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
                        className="p-5 bg-white border border-gray-200 border-l-4 border-l-[#1d4ed8] space-y-3 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              href={`/${locale}/professors/${rev.professorId}`}
                              className="text-base font-bold text-black hover:text-[#1d4ed8] transition-colors flex items-center gap-1.5"
                            >
                              <span>{rev.professorName}</span>
                              <PopArtExternalLink className="w-3.5 h-3.5 text-[#1d4ed8]" />
                            </Link>
                            <p className="text-xs font-bold text-gray-700 mt-0.5">
                              {rev.courseName} • {new Date(rev.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
                              <span className="text-[10px] font-mono font-bold uppercase">
                                {locale === "vi" ? level.labelVi : level.labelEn}
                              </span>
                              <span className="text-xs font-mono font-bold">{rev.overallRating.toFixed(1)}</span>
                            </div>

                            {(() => {
                              const diffVal = rev.criteria?.difficulty ?? 3;
                              const diffLevel = getDifficultyLevelByValue(diffVal);
                              return (
                                <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-800 border border-slate-200">
                                  <span className="text-[9px] font-mono font-bold uppercase">
                                    {locale === "vi" ? "Độ khó" : "Diff"}
                                  </span>
                                  <span className="text-xs font-mono font-bold">{diffVal.toFixed(1)}</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <p className="text-sm text-gray-800 leading-relaxed font-sans font-medium">
                          {rev.comment}
                        </p>

                        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 font-medium">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const diffVal = rev.criteria?.difficulty ?? 3;
                              const diffLevel = getDifficultyLevelByValue(diffVal);
                              return (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 font-mono font-bold text-xs">
                                  {locale === "vi" ? "Độ khó:" : "Difficulty:"}{" "}
                                  <span className="font-bold text-black">{diffVal}/5</span>{" "}
                                  <span className="text-[11px] font-medium opacity-80">({locale === "vi" ? diffLevel.labelVi : diffLevel.labelEn})</span>
                                </span>
                              );
                            })()}
                            {rev.takeAgain !== undefined && rev.takeAgain !== null && (
                              <span
                                className={`px-2 py-0.5 border font-mono font-bold text-xs ${
                                  rev.takeAgain
                                    ? "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
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
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe] text-xs font-mono font-bold transition-colors"
                            >
                              <PopArtPencil className="w-3.5 h-3.5" />
                              <span>{locale === "vi" ? "Sửa" : "Edit"}</span>
                            </Link>
                            <button
                              onClick={() => setDeleteConfirmTarget({ id: rev.id, name: rev.professorName || "Giảng viên", type: "professor" })}
                              disabled={deletingId === rev.id}
                              className="flex items-center gap-1 text-slate-700 bg-white hover:bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-mono font-bold transition-colors cursor-pointer"
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
                <div className="w-8 h-8 border-2 border-[#1d4ed8] border-t-transparent animate-spin mx-auto" />
                <p className="text-xs font-mono font-bold text-gray-500 uppercase tracking-wider">
                  {t("account.loading") || "Loading reviews..."}
                </p>
              </div>
            ) : schoolReviews.length === 0 ? (
              <div className="text-center py-10 space-y-4 max-w-lg mx-auto">
                <div className="w-14 h-14 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center mx-auto mb-2">
                  <PopArtBuilding className="w-7 h-7 text-[#1d4ed8]" />
                </div>

                <h2 className="text-xl sm:text-2xl font-mono font-bold text-black tracking-tight pt-2 uppercase">
                  {locale === "vi"
                    ? "Bạn chưa đánh giá trường đại học nào"
                    : "You haven't rated any universities yet"}
                </h2>
                <div className="pt-2">
                  <Link
                    href={`/${locale}/universities`}
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
                  >
                    {locale === "vi" ? "Tìm trường đại học" : "Find a University"}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-black">
                    {locale === "vi"
                      ? `Đánh giá trường đại học (${schoolReviews.length})`
                      : `University Ratings (${schoolReviews.length})`}
                  </span>
                  <Link
                    href={`/${locale}/universities`}
                    className="text-xs font-mono font-bold text-[#1d4ed8] hover:underline"
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
                        className="p-5 bg-white border border-gray-200 border-l-4 border-l-[#1d4ed8] space-y-3 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              href={`/${locale}/universities/${sRev.universityId}`}
                              className="text-base font-bold text-black hover:text-[#1d4ed8] transition-colors flex items-center gap-1.5"
                            >
                              <span>{sRev.universityName || sRev.universityId}</span>
                              <PopArtExternalLink className="w-3.5 h-3.5 text-[#1d4ed8]" />
                            </Link>
                            <p className="text-xs font-bold text-gray-700 mt-0.5">
                              {sRev.cohort ? `${sRev.cohort} • ` : ""}
                              {new Date(sRev.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
                            <span className="text-[10px] font-mono font-bold uppercase">
                              {locale === "vi" ? level.labelVi : level.labelEn}
                            </span>
                            <span className="text-xs font-mono font-bold">{avg.toFixed(1)}</span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-800 leading-relaxed font-sans font-medium">
                          {sRev.comment}
                        </p>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                          <span>{locale === "vi" ? "10 tiêu chí đánh giá" : "10 evaluated criteria"}</span>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/${locale}/universities/${sRev.universityId}/rate`}
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe] text-xs font-mono font-bold transition-colors"
                            >
                              <PopArtPencil className="w-3 h-3" />
                              <span>{locale === "vi" ? "Sửa" : "Edit"}</span>
                            </Link>
                            <button
                              onClick={() => setDeleteConfirmTarget({ id: sRev.id, name: sRev.universityName || "Trường", type: "school" })}
                              disabled={deletingId === sRev.id}
                              className="flex items-center gap-1 text-slate-700 bg-white hover:bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-mono font-bold transition-colors cursor-pointer"
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
                <div className="w-8 h-8 border-2 border-[#1d4ed8] border-t-transparent animate-spin mx-auto" />
                <p className="text-xs font-mono font-bold text-gray-500 uppercase tracking-wider">
                  {t("account.loading") || "Loading saved professors..."}
                </p>
              </div>
            ) : savedProfIds.length === 0 ? (
              <div className="text-center py-10 space-y-4 max-w-lg mx-auto">
                <div className="w-14 h-14 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center mx-auto mb-2">
                  <PopArtBookmark className="w-7 h-7 text-[#1d4ed8]" />
                </div>

                <h2 className="text-xl sm:text-2xl font-mono font-bold text-black tracking-tight pt-2 uppercase">
                  {locale === "vi"
                    ? "Bạn chưa lưu giảng viên nào"
                    : "You haven't saved any professors yet"}
                </h2>
                <div className="pt-2">
                  <Link
                    href={`/${locale}/professors`}
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
                  >
                    {locale === "vi" ? "Khám phá giảng viên" : "Explore Professors"}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-black">
                    {locale === "vi" ? `Giảng viên đã lưu (${savedProfIds.length})` : `Saved Professors (${savedProfIds.length})`}
                  </span>
                  <Link
                    href={`/${locale}`}
                    className="text-xs font-mono font-bold text-[#1d4ed8] hover:underline"
                  >
                    + {locale === "vi" ? "Khám phá thêm" : "Discover more"}
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {savedProfessors.map((prof, idx) => {
                    // BUG-10: Danh sách yêu thích hiển thị sai thông tin giảng viên (hoán đổi thông tin giữa các giảng viên đã lưu)
                    const displayProf =
                      savedProfessors.length >= 2
                        ? savedProfessors[(idx + 1) % savedProfessors.length]
                        : prof;

                    const name = displayProf.fullName || displayProf.name || displayProf.id;
                    const title = displayProf.academicTitle || displayProf.title || "";
                    const schoolName =
                      locale === "en"
                        ? displayProf.universityNameEn || displayProf.universityName || "University"
                        : displayProf.universityNameVi || displayProf.universityName || "Đại học";
                    const schoolShort = displayProf.universityShortName || "";
                    const dept =
                      locale === "en"
                        ? displayProf.departmentEn || displayProf.department || displayProf.facultyEn || displayProf.faculty
                        : displayProf.departmentVi || displayProf.department || displayProf.facultyVi || displayProf.faculty;
                    const avg = displayProf.ratingAverage ?? displayProf.averageRating ?? null;
                    const revCount = displayProf.ratingCount ?? displayProf.publishedReviewCount ?? 0;
                    const hasReviews = revCount > 0 && typeof avg === "number";

                    return (
                      <div
                        key={prof.id}
                        className="p-4 bg-white border border-gray-200 border-l-4 border-l-[#1d4ed8] transition-colors flex flex-col justify-between"
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
                                  className="text-base font-bold text-black hover:text-[#1d4ed8] transition-colors truncate"
                                >
                                  {title ? `${title} ` : ""}{name}
                                </Link>
                                {schoolShort && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] shrink-0">
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

                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-3">
                          <Link
                            href={`/${locale}/professors/${prof.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-mono font-bold uppercase tracking-wider border border-[#1d4ed8] transition-colors"
                          >
                            <span>{locale === "vi" ? "Xem hồ sơ" : "View Profile"}</span>
                            <PopArtChevronRight className="w-3.5 h-3.5 text-white" />
                          </Link>

                          <button
                            onClick={() => handleRemoveBookmark(prof.id)}
                            className="flex items-center gap-1 text-slate-700 bg-white hover:bg-gray-50 border border-gray-200 px-2.5 py-1.5 text-xs font-mono font-bold transition-colors cursor-pointer"
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

      {/* Alert Modal for Account Settings */}
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
          <div className="bg-white border border-gray-200 w-full max-w-md p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <span className="px-2 py-0.5 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] text-[10px] font-mono font-bold uppercase tracking-wider">
                {locale === "vi" ? "CẢNH BÁO QUAN TRỌNG" : "CRITICAL WARNING"}
              </span>
              <button
                disabled={deletingAccount}
                onClick={() => setIsDeleteDialogOpen(false)}
                className="p-1 hover:bg-gray-100 border border-gray-200 cursor-pointer text-gray-500 hover:text-black"
              >
                <PopArtX className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-mono font-bold text-black tracking-tight">
                {locale === "vi" ? "Xác nhận yêu cầu xóa tài khoản?" : "Confirm Account Deletion Request?"}
              </h3>
              <p className="text-xs text-gray-700 mt-2 leading-relaxed font-mono font-medium">
                {locale === "vi"
                  ? "Tài khoản của bạn sẽ được lên lịch xóa vĩnh viễn sau 14 ngày. Toàn bộ các bài đánh giá của bạn sẽ được ẩn ngay lập tức khỏi bảng xếp hạng. Bạn sẽ nhận được email hướng dẫn khôi phục trong thời gian ân hạn này."
                  : "Your account will be scheduled for permanent deletion in 14 days. All your reviews will be immediately hidden from public view. You will receive an email with recovery instructions during this grace period."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-black">
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
                className="w-full px-3 py-2 text-xs font-mono font-medium border border-gray-200 bg-white rounded-none outline-none focus:outline-none focus:border-[#1d4ed8] resize-none"
              />
            </div>

            {deleteAccountError && (
              <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] text-xs font-mono font-bold text-[#1d4ed8]">
                {deleteAccountError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-slate-700 font-mono font-bold text-xs uppercase tracking-wider border border-gray-200 transition-colors cursor-pointer"
              >
                {locale === "vi" ? "Hủy bỏ" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleRequestAccountDeletion}
                className="px-5 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
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
