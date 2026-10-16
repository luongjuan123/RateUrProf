"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/locales/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AuthModal } from "./AuthModal";
import {
  GraduationCap,
  Search,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Edit3,
  Bookmark,
  ChevronDown,
  Sparkles
} from "lucide-react";

function NavbarInner() {
  const { user, userProfile, logOut } = useAuth();
  const { locale, t } = useTranslation();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: `/${locale}`, label: t("nav.home") },
    { href: `/${locale}/professors`, label: t("nav.professors") },
    { href: `/${locale}/universities`, label: t("nav.universities") },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <div className="flex items-center gap-6">
              <Link href={`/${locale}`} className="group flex items-center gap-2.5">
                <div className="w-8 h-8 bg-black flex items-center justify-center text-white font-black text-sm tracking-tighter group-hover:bg-[#e03a3e] transition-colors">
                  RP
                </div>
                <span className="font-black text-xl tracking-tight text-gray-950">
                  RateProf<span className="text-[#e03a3e]">CủaBạn</span>
                </span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 text-xs font-bold tracking-wider uppercase transition-colors relative flex items-center gap-1.5 ${
                      isActive
                        ? "text-[#e03a3e] border-b-2 border-[#e03a3e]"
                        : "text-gray-700 hover:text-black hover:bg-gray-50"
                    }`}
                  >
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions: Language Switcher, Search Link, Review CTA, Auth */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Switcher */}
              <LanguageSwitcher />

              <Link
                href={`/${locale}/professors`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-[#e03a3e] hover:bg-[#b91c1c] transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t("nav.writeReview")}</span>
              </Link>

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    aria-expanded={isUserMenuOpen}
                    aria-label={t("nav.account")}
                    className="flex items-center gap-2 py-1.5 px-3 border border-gray-200 hover:border-gray-400 bg-white transition-all text-left"
                  >
                    <div className="w-7 h-7 bg-gray-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                      {userProfile?.displayName ? userProfile.displayName.charAt(0) : "S"}
                    </div>
                    <span className="hidden sm:block text-xs font-semibold text-gray-800 max-w-[120px] truncate">
                      {userProfile?.displayName || t("nav.account")}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-900 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500 font-medium">{t("nav.signedInAs")}</p>
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {userProfile?.displayName || user.email || t("nav.student")}
                        </p>
                        {user.isAnonymous && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            {t("nav.anonymousMode")}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/${locale}/my-reviews`}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-black"
                      >
                        <Bookmark className="w-4 h-4 text-gray-500" />
                        {t("nav.myReviews")}
                      </Link>

                      <Link
                        href={`/${locale}/guidelines`}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-black"
                      >
                        <ShieldCheck className="w-4 h-4 text-gray-500" />
                        {t("nav.civilityStandards")}
                      </Link>

                      <button
                        onClick={async () => {
                          setIsUserMenuOpen(false);
                          await logOut();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 text-left border-t border-gray-100"
                      >
                        <LogOut className="w-4 h-4" />
                        {t("nav.signOut")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors"
                >
                  {t("nav.signIn")}
                </button>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="lg:hidden p-2 text-gray-700 hover:text-black hover:bg-gray-100"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm font-semibold ${
                  pathname === link.href
                    ? "bg-red-50 text-[#e03a3e] font-bold"
                    : "text-gray-800 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2">
              <Link
                href={`/${locale}/professors`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#e03a3e]"
              >
                <Edit3 className="w-4 h-4" />
                {t("nav.writeReview")}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}

export const Navbar: React.FC = () => {
  return (
    <Suspense fallback={<div className="h-16 bg-white border-b border-gray-200 animate-pulse" />}>
      <NavbarInner />
    </Suspense>
  );
};
