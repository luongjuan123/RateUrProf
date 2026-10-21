"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/locales/i18n";
import { getBookmarks, BOOKMARKS_CHANGED_EVENT } from "@/lib/bookmarks";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AuthModal } from "./AuthModal";
import { BrandLogo } from "./BrandLogo";
import {
  PopArtBookmark,
  PopArtUser,
  PopArtSettings,
  PopArtStar,
  PopArtShieldAlert,
  PopArtBook,
  PopArtLogOut,
  PopArtLock,
  PopArtChevronDown,
  PopArtBuilding,
} from "./icons/PopArtIcons";

function NavbarInner() {
  const { user, userProfile, logOut, isLocked, isAuthModalOpen, openAuthModal, closeAuthModal, authReturnUrl } = useAuth();
  const { locale, t } = useTranslation();
  const router = useRouter();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSavedCount(getBookmarks(user?.uid).length);

    const handleBookmarkChange = () => {
      setSavedCount(getBookmarks(user?.uid).length);
    };

    window.addEventListener(BOOKMARKS_CHANGED_EVENT, handleBookmarkChange);
    return () => {
      window.removeEventListener(BOOKMARKS_CHANGED_EVENT, handleBookmarkChange);
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const handleSavedProfessorsClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      openAuthModal(`/${locale}/account/saved-professors`);
    } else if (isLocked) {
      e.preventDefault();
      router.push(`/${locale}/locked`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo */}
            <div className="flex items-center">
              <BrandLogo locale={locale} />
            </div>

            {/* Right Actions: Language Switcher, Saved Professors, Auth */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Saved Professors Quick Link */}
              <Link
                href={`/${locale}/account/saved-professors`}
                onClick={handleSavedProfessorsClick}
                aria-label={t("account.savedProfessors") || "Saved Professors"}
                title={t("account.savedProfessors") || "Saved Professors"}
                className="relative p-2 border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000000] hover:shadow-[3px_3px_0px_0px_#000000] hover:bg-[#fef9c3] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center cursor-pointer"
              >
                <PopArtBookmark className="w-4 h-4" filled={savedCount > 0} color="#facc15" />
                {savedCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#e03a3e] text-white text-[10px] font-mono font-black px-1.5 py-0.2 border border-black shadow-[1px_1px_0px_#000] min-w-[18px] text-center leading-tight">
                    {savedCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    aria-expanded={isUserMenuOpen}
                    aria-label={t("nav.account")}
                    className={`flex items-center gap-2 py-1.5 px-3 border-2 border-black ${
                      isLocked ? "bg-[#fee2e2]" : "bg-white"
                    } shadow-[2px_2px_0px_0px_#000000] hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-left`}
                  >
                    <div className={`w-7 h-7 ${isLocked ? "bg-[#e03a3e]" : "bg-black"} text-white border border-black flex items-center justify-center font-bold text-xs uppercase`}>
                      {isLocked ? <PopArtLock className="w-3.5 h-3.5" /> : (userProfile?.displayName ? userProfile.displayName.charAt(0) : "S")}
                    </div>
                    <span className="hidden sm:block text-xs font-black text-gray-900 max-w-[120px] truncate">
                      {isLocked ? (locale === "vi" ? "BỊ KHÓA" : "LOCKED") : `${t("account.hey")} ${userProfile?.firstName ? userProfile.firstName.toUpperCase() : userProfile?.displayName?.toUpperCase() || t("nav.student").toUpperCase()}`}
                    </span>
                    <PopArtChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] overflow-hidden z-50">
                      <div className={`px-3.5 py-2.5 border-b-2 border-black ${isLocked ? "bg-[#fee2e2]" : "bg-[#fef9c3]"} flex items-center gap-2.5`}>
                        <div className={`w-8 h-8 ${isLocked ? "bg-[#e03a3e]" : "bg-black"} text-white border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center font-black text-xs uppercase shrink-0`}>
                          {isLocked ? <PopArtLock className="w-4 h-4" /> : (userProfile?.displayName ? userProfile.displayName.charAt(0) : "S")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-gray-700 font-bold uppercase tracking-wider leading-none mb-0.5">
                            {isLocked ? (locale === "vi" ? "TÀI KHOẢN BỊ KHÓA" : "ACCOUNT LOCKED") : t("nav.signedInAs")}
                          </p>
                          <p className="text-xs font-black text-black truncate leading-tight" title={userProfile?.displayName || user.email || t("nav.student")}>
                            {userProfile?.displayName || user.email || t("nav.student")}
                          </p>
                        </div>
                      </div>

                      {isLocked ? (
                        <>
                          <Link
                            href={`/${locale}/locked`}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2.5 text-xs font-black text-red-900 bg-red-50 hover:bg-[#fee2e2] border-b border-gray-100 whitespace-nowrap transition-colors"
                          >
                            <span className="w-7 h-7 bg-[#fee2e2] border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0">
                              <PopArtLock className="w-4 h-4" />
                            </span>
                            <div className="flex flex-col">
                              <span>{locale === "vi" ? "Trang tài khoản bị khóa" : "Locked Account"}</span>
                              <span className="text-[10px] text-red-700 font-bold">{locale === "vi" ? "Gửi đơn kháng nghị" : "Submit appeal"}</span>
                            </div>
                          </Link>
                          <Link
                            href={`/${locale}/guidelines`}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-gray-900 hover:bg-[#e9d5ff]/30 whitespace-nowrap transition-colors"
                          >
                            <span className="w-7 h-7 bg-[#e9d5ff] border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0 group-hover:shadow-[1px_1px_0px_#000] group-hover:translate-x-[0.5px] group-hover:translate-y-[0.5px] transition-all">
                              <PopArtBook className="w-4 h-4" />
                            </span>
                            <span>{t("nav.civilityStandards")}</span>
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            href={`/${locale}/account/profile`}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-gray-900 hover:bg-[#e0f2fe] border-b border-gray-100 whitespace-nowrap transition-colors"
                          >
                            <span className="w-7 h-7 bg-[#bae6fd] border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0 group-hover:shadow-[1px_1px_0px_#000] group-hover:translate-x-[0.5px] group-hover:translate-y-[0.5px] transition-all">
                              <PopArtUser className="w-4 h-4" />
                            </span>
                            <span>{t("account.profile")}</span>
                          </Link>

                          <Link
                            href={`/${locale}/account/settings`}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-gray-900 hover:bg-[#fed7aa]/30 border-b border-gray-100 whitespace-nowrap transition-colors"
                          >
                            <span className="w-7 h-7 bg-[#fed7aa] border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0 group-hover:shadow-[1px_1px_0px_#000] group-hover:translate-x-[0.5px] group-hover:translate-y-[0.5px] transition-all">
                              <PopArtSettings className="w-4 h-4" />
                            </span>
                            <span>{t("account.settings")}</span>
                          </Link>

                          <Link
                            href={`/${locale}/account/ratings`}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-gray-900 hover:bg-[#fef08a]/40 border-b border-gray-100 whitespace-nowrap transition-colors"
                          >
                            <span className="w-7 h-7 bg-[#fef08a] border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0 group-hover:shadow-[1px_1px_0px_#000] group-hover:translate-x-[0.5px] group-hover:translate-y-[0.5px] transition-all">
                              <PopArtStar className="w-4 h-4" filled={true} />
                            </span>
                            <span>{t("account.professorRatings")}</span>
                          </Link>

                          <Link
                            href={`/${locale}/account/school-ratings`}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-gray-900 hover:bg-[#fed7aa]/40 border-b border-gray-100 whitespace-nowrap transition-colors"
                          >
                            <span className="w-7 h-7 bg-[#fed7aa] border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0 group-hover:shadow-[1px_1px_0px_#000] group-hover:translate-x-[0.5px] group-hover:translate-y-[0.5px] transition-all">
                              <PopArtBuilding className="w-4 h-4 text-black" />
                            </span>
                            <span>{t("account.schoolRatings")}</span>
                          </Link>

                          <Link
                            href={`/${locale}/account/saved-professors`}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-gray-900 hover:bg-[#bbf7d0]/30 border-b border-gray-100 whitespace-nowrap transition-colors"
                          >
                            <span className="w-7 h-7 bg-[#bbf7d0] border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0 group-hover:shadow-[1px_1px_0px_#000] group-hover:translate-x-[0.5px] group-hover:translate-y-[0.5px] transition-all">
                              <PopArtBookmark className="w-4 h-4" filled={true} color="#bbf7d0" />
                            </span>
                            <span>{t("account.savedProfessors")}</span>
                          </Link>

                          {user?.email?.toLowerCase() === "dungpubgame@gmail.com" && (
                            <Link
                              href={`/${locale}/admin`}
                              onClick={() => setIsUserMenuOpen(false)}
                              className="group flex items-center gap-3 px-3.5 py-2 text-xs font-black text-[#e03a3e] hover:bg-[#fecaca]/40 border-b border-gray-100 whitespace-nowrap transition-colors"
                            >
                              <span className="w-7 h-7 bg-[#fecaca] border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0 group-hover:shadow-[1px_1px_0px_#000] group-hover:translate-x-[0.5px] group-hover:translate-y-[0.5px] transition-all">
                                <PopArtShieldAlert className="w-4 h-4" />
                              </span>
                              <span>{t("nav.admin") || "Admin Console"}</span>
                            </Link>
                          )}

                          <Link
                            href={`/${locale}/guidelines`}
                            onClick={() => setIsUserMenuOpen(false)}
                            className="group flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-gray-900 hover:bg-[#e9d5ff]/30 whitespace-nowrap transition-colors"
                          >
                            <span className="w-7 h-7 bg-[#e9d5ff] border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0 group-hover:shadow-[1px_1px_0px_#000] group-hover:translate-x-[0.5px] group-hover:translate-y-[0.5px] transition-all">
                              <PopArtBook className="w-4 h-4" />
                            </span>
                            <span>{t("nav.civilityStandards")}</span>
                          </Link>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          setIsUserMenuOpen(false);
                          await logOut();
                        }}
                        className="group w-full flex items-center gap-3 px-3.5 py-2 text-xs font-black text-red-700 hover:bg-[#fee2e2] text-left border-t-2 border-black whitespace-nowrap transition-colors cursor-pointer"
                      >
                        <span className="w-7 h-7 bg-[#fee2e2] border border-black shadow-[1.5px_1.5px_0px_#000] flex items-center justify-center shrink-0 group-hover:shadow-[1px_1px_0px_#000] group-hover:translate-x-[0.5px] group-hover:translate-y-[0.5px] transition-all">
                          <PopArtLogOut className="w-4 h-4" />
                        </span>
                        <span>{t("nav.signOut")}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => openAuthModal()}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider text-black bg-[#e0f2fe] hover:bg-[#bae6fd] border-2 border-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                >
                  {t("nav.signIn")}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} returnUrl={authReturnUrl} />
    </>
  );
}

export const Navbar: React.FC = () => {
  return (
    <Suspense fallback={<div className="h-20 bg-white border-b border-gray-200/80" />}>
      <NavbarInner />
    </Suspense>
  );
};
