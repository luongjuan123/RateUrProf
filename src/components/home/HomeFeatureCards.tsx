"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/locales/i18n";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";

export const HomeFeatureCards: React.FC = () => {
  const { locale, t } = useTranslation();
  const { user } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <section className="py-20 bg-[#f8fafc] border-t border-gray-200 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
        {/* Section Heading matching Super Flat Blue & White Hierarchy */}
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 uppercase">
            {t("home.featuresTitle")}
          </h2>
          <div className="w-12 h-1 bg-[#1d4ed8] mx-auto mt-3" />
        </div>

        {/* 3 Geometric Blueprint Cards in Blue & White */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch text-left">
          {/* ========================================================
              CARD 1: Manage and edit your ratings
             ======================================================== */}
          <div className="flex flex-col justify-between p-8 bg-white text-slate-900 border border-gray-200 relative group min-h-[300px] transition-colors hover:border-[#1d4ed8]">
            <div className="space-y-6">
              {/* Geometric Line Wireframe Diagram (Steps / Matrix) in Blue */}
              <div className="w-20 h-20 text-[#1d4ed8]">
                <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                  <rect x="15" y="15" width="20" height="20" fill="#eff6ff" />
                  <rect x="35" y="15" width="20" height="20" />
                  <rect x="55" y="15" width="20" height="20" />
                  <rect x="15" y="35" width="20" height="20" />
                  <rect x="35" y="35" width="20" height="20" fill="#eff6ff" />
                  <rect x="55" y="35" width="20" height="20" />
                  <rect x="15" y="55" width="20" height="20" />
                  <rect x="35" y="55" width="20" height="20" />
                  <rect x="55" y="55" width="20" height="20" fill="#eff6ff" />
                  <line x1="15" y1="75" x2="75" y2="75" />
                  <line x1="75" y1="15" x2="75" y2="75" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  {t("home.feature1Title")}
                </h3>
                <p className="text-xs text-slate-600 mt-2 font-mono leading-relaxed">
                  {locale === "vi"
                    ? "Quản lý và điều chỉnh các bài đánh giá của bạn một cách rõ ràng và bảo mật."
                    : "Easily update and organize your academic evaluations with transparent audit records."}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <span className="text-[#1d4ed8] text-sm font-bold">→</span>
            </div>
          </div>

          {/* ========================================================
              CARD 2: Rate anonymously
             ======================================================== */}
          <div className="flex flex-col justify-between p-8 bg-white text-slate-900 border border-gray-200 relative group min-h-[300px] transition-colors hover:border-[#1d4ed8]">
            <div className="space-y-6">
              {/* Geometric Line Wireframe Diagram (Isometric Cube) in Blue */}
              <div className="w-20 h-20 text-[#1d4ed8]">
                <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                  <polygon points="50,15 80,32 50,49 20,32" fill="#eff6ff" />
                  <polygon points="20,32 50,49 50,85 20,68" />
                  <polygon points="50,49 80,32 80,68 50,85" />
                  <line x1="50" y1="15" x2="50" y2="49" strokeDasharray="3 3" opacity="0.6" />
                  <line x1="20" y1="32" x2="50" y2="49" />
                  <line x1="80" y1="32" x2="50" y2="49" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  {t("home.feature2Title")}
                </h3>
                <p className="text-xs text-slate-600 mt-2 font-mono leading-relaxed">
                  {locale === "vi"
                    ? "Danh tính sinh viên hoàn toàn được ẩn danh khi đóng góp ý kiến trung thực."
                    : "Zero tracking of student identity. Share candid experiences in total anonymity."}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <span className="text-[#1d4ed8] text-sm font-bold">→</span>
            </div>
          </div>

          {/* ========================================================
              CARD 3: Like or dislike ratings
             ======================================================== */}
          <div className="flex flex-col justify-between p-8 bg-white text-slate-900 border border-gray-200 relative group min-h-[300px] transition-colors hover:border-[#1d4ed8]">
            <div className="space-y-6">
              {/* Geometric Line Wireframe Diagram (Nested Rectangles) in Blue */}
              <div className="w-20 h-20 text-[#1d4ed8]">
                <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                  <rect x="15" y="15" width="40" height="40" />
                  <rect x="25" y="25" width="40" height="40" />
                  <rect x="35" y="35" width="40" height="40" fill="#eff6ff" />
                  <rect x="45" y="45" width="40" height="40" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  {t("home.feature3Title")}
                </h3>
                <p className="text-xs text-slate-600 mt-2 font-mono leading-relaxed">
                  {locale === "vi"
                    ? "Bình chọn các đánh giá hữu ích giúp cộng đồng sinh viên đưa ra quyết định đúng đắn."
                    : "Upvote constructive feedback to surface the most helpful guidance for peers."}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <span className="text-[#1d4ed8] text-sm font-bold">→</span>
            </div>
          </div>
        </div>

        {/* Action Button matching Super Flat Blue & White Aesthetic */}
        <div className="pt-6">
          {user ? (
            <Link
              href={`/${locale}/account/ratings`}
              className="inline-flex items-center justify-center px-8 py-3.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
            >
              {t("home.myRatingsBtn")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="inline-flex items-center justify-center px-8 py-3.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer"
            >
              {t("home.myRatingsBtn")}
            </button>
          )}
        </div>
      </div>

      {/* Auth Modal Trigger */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </section>
  );
};
