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
    <section className="py-20 bg-white border-t-2 border-black relative overflow-hidden">
      {/* Background Soft Organic Blob Accent */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-sky-50/60 rounded-full blur-3xl pointer-events-none -z-10"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
        {/* Section Heading matching Reference */}
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold sm:font-black tracking-tight text-gray-900">
            {t("home.featuresTitle")}
          </h2>
        </div>

        {/* 3 Illustrated Feature Columns matching Reference */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 items-start">
          {/* ========================================================
              CARD 1: Manage and edit your ratings (Giant Pencil)
             ======================================================== */}
          <div className="flex flex-col items-center text-center space-y-4 group">
            <div className="w-52 h-52 flex items-center justify-center relative transition-transform duration-200 group-hover:scale-105">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Yellow organic blob background */}
                <path
                  d="M45 100 C30 130, 60 170, 95 165 C130 160, 160 140, 150 105 C140 70, 120 60, 85 65 C50 70, 60 70, 45 100 Z"
                  fill="#fef08a"
                />

                {/* Comic accent squiggles */}
                <path d="M72 45 C75 42, 80 44, 84 48" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M125 50 C128 47, 133 49, 137 53" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />

                {/* Character holding giant pencil */}
                {/* Character Body / Coat (Blue) */}
                <path
                  d="M102 78 C98 72, 114 68, 120 74 L138 128 C135 132, 110 136, 102 128 Z"
                  fill="#0284c7"
                  stroke="#111111"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />

                {/* Giant Yellow Pencil angled */}
                <g transform="rotate(-36 90 120)">
                  {/* Pencil eraser */}
                  <rect x="70" y="55" width="22" height="14" rx="2" fill="#f43f5e" stroke="#111111" strokeWidth="3" />
                  <rect x="70" y="69" width="22" height="6" fill="#cbd5e1" stroke="#111111" strokeWidth="2.5" />
                  {/* Pencil body */}
                  <rect x="70" y="75" width="22" height="70" fill="#facc15" stroke="#111111" strokeWidth="3.5" />
                  <line x1="77" y1="75" x2="77" y2="145" stroke="#ca8a04" strokeWidth="2" />
                  <line x1="85" y1="75" x2="85" y2="145" stroke="#ca8a04" strokeWidth="2" />
                  {/* Pencil wood tip */}
                  <polygon points="70,145 92,145 81,165" fill="#fde68a" stroke="#111111" strokeWidth="3" strokeLinejoin="round" />
                  {/* Graphite point */}
                  <polygon points="77,157 85,157 81,165" fill="#111111" />
                </g>

                {/* Character Pink Hair & Head */}
                <circle cx="118" cy="62" r="14" fill="#f472b6" stroke="#111111" strokeWidth="3.5" />
                <ellipse cx="114" cy="64" rx="6" ry="7" fill="#fed7aa" stroke="#111111" strokeWidth="2.5" />

                {/* Character Hands wrapped on pencil */}
                <circle cx="98" cy="98" r="6" fill="#fed7aa" stroke="#111111" strokeWidth="3" />
                <circle cx="106" cy="116" r="6" fill="#fed7aa" stroke="#111111" strokeWidth="3" />

                {/* Character Blue Leggings & Shoes */}
                <path d="M112 130 L110 162" stroke="#0284c7" strokeWidth="6" strokeLinecap="round" />
                <path d="M124 130 L126 162" stroke="#0284c7" strokeWidth="6" strokeLinecap="round" />
                <ellipse cx="107" cy="164" rx="7" ry="4" fill="#111111" />
                <ellipse cx="130" cy="164" rx="7" ry="4" fill="#111111" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-extrabold sm:font-black text-gray-900 tracking-tight">
                {t("home.feature1Title")}
              </h3>
            </div>
          </div>

          {/* ========================================================
              CARD 2: Rate anonymously (Sunglasses behind Monstera)
             ======================================================== */}
          <div className="flex flex-col items-center text-center space-y-4 group">
            <div className="w-52 h-52 flex items-center justify-center relative transition-transform duration-200 group-hover:scale-105">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Purple / Magenta organic blob background */}
                <path
                  d="M50 90 C35 60, 75 40, 115 45 C155 50, 165 90, 155 125 C145 160, 95 165, 65 150 C35 135, 65 120, 50 90 Z"
                  fill="#fbcfe8"
                />

                {/* Character peeking */}
                <circle cx="102" cy="88" r="28" fill="#fed7aa" stroke="#111111" strokeWidth="3.5" />
                {/* Blue Bucket Hat */}
                <path
                  d="M72 74 C74 54, 130 54, 132 74 L142 80 H62 Z"
                  fill="#38bdf8"
                  stroke="#111111"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                {/* Cool Black Sunglasses */}
                <rect x="84" y="80" width="16" height="11" rx="2" fill="#111111" stroke="#111111" strokeWidth="2" />
                <rect x="104" y="80" width="16" height="11" rx="2" fill="#111111" stroke="#111111" strokeWidth="2" />
                <line x1="99" y1="84" x2="105" y2="84" stroke="#111111" strokeWidth="3" />

                {/* Monstera Leaves & Foliage (Lush Cyan & Green with bold outlines) */}
                {/* Left Leaf */}
                <path
                  d="M42 120 C42 85, 82 85, 96 110 C92 118, 80 120, 76 130 C72 140, 60 148, 42 120 Z"
                  fill="#38bdf8"
                  stroke="#111111"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                {/* Center Giant Monstera Leaf */}
                <path
                  d="M85 170 C70 140, 75 110, 102 98 C128 110, 135 140, 118 170 C108 162, 104 150, 102 150 C100 150, 96 162, 85 170 Z"
                  fill="#06b6d4"
                  stroke="#111111"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                {/* Leaf cuts / perforations */}
                <path d="M88 122 C94 126, 96 130, 90 134" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
                <path d="M116 122 C110 126, 108 130, 114 134" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
                <line x1="102" y1="102" x2="102" y2="168" stroke="#111111" strokeWidth="3" strokeLinecap="round" />

                {/* Right Leaf (Yellow-Green) */}
                <path
                  d="M125 105 C145 92, 165 110, 155 135 C145 138, 138 130, 130 140 C125 125, 120 115, 125 105 Z"
                  fill="#facc15"
                  stroke="#111111"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />

                {/* Peeking Hand */}
                <circle cx="128" cy="115" r="5" fill="#fed7aa" stroke="#111111" strokeWidth="2.5" />
                <circle cx="132" cy="118" r="5" fill="#fed7aa" stroke="#111111" strokeWidth="2.5" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-extrabold sm:font-black text-gray-900 tracking-tight">
                {t("home.feature2Title")}
              </h3>
            </div>
          </div>

          {/* ========================================================
              CARD 3: Like or dislike ratings (Thumbs Up & Thumbs Down)
             ======================================================== */}
          <div className="flex flex-col items-center text-center space-y-4 group">
            <div className="w-52 h-52 flex items-center justify-center relative transition-transform duration-200 group-hover:scale-105">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Yellow & Cyan organic blob backgrounds */}
                <path
                  d="M48 85 C35 55, 70 45, 105 52 C125 56, 138 75, 128 100 C118 125, 60 115, 48 85 Z"
                  fill="#38bdf8"
                />
                <path
                  d="M100 120 C100 95, 135 90, 155 105 C175 120, 165 155, 140 162 C115 170, 100 145, 100 120 Z"
                  fill="#fef08a"
                />

                {/* Sparkles / motion bursts */}
                <path d="M42 45 L48 52 M36 54 L44 54" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
                <path d="M158 55 C162 52, 168 54, 172 58" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M165 155 L170 160 M172 148 L170 156" stroke="#111111" strokeWidth="3" strokeLinecap="round" />

                {/* Pink Thumbs Up Hand */}
                <g transform="translate(48, 62)">
                  {/* Thumb pointing up */}
                  <path
                    d="M32 30 V12 C32 6, 26 4, 22 8 C18 12, 18 20, 18 24 L14 26 C8 27, 4 32, 4 38 L4 54 C4 58, 8 62, 14 62 H38 C44 62, 48 56, 46 50 L48 44 C49 40, 46 36, 42 34 L42 30 Z"
                    fill="#f472b6"
                    stroke="#111111"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                  />
                  {/* Finger creases */}
                  <line x1="22" y1="36" x2="38" y2="36" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="22" y1="44" x2="40" y2="44" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="22" y1="52" x2="36" y2="52" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
                </g>

                {/* Cyan Thumbs Down Hand */}
                <g transform="translate(108, 92)">
                  {/* Thumb pointing down */}
                  <path
                    d="M12 28 V46 C12 52, 18 54, 22 50 C26 46, 26 38, 26 34 L30 32 C36 31, 40 26, 40 20 L40 6 C40 2, 36 -2, 30 -2 H8 C2 -2, -2 4, 0 10 L-2 16 C-3 20, 0 24, 4 26 L4 28 Z"
                    fill="#67e8f9"
                    stroke="#111111"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                  />
                  {/* Finger creases */}
                  <line x1="22" y1="22" x2="6" y2="22" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="22" y1="14" x2="4" y2="14" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="22" y1="6" x2="8" y2="6" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
                </g>
              </svg>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-extrabold sm:font-black text-gray-900 tracking-tight">
                {t("home.feature3Title")}
              </h3>
            </div>
          </div>
        </div>

        {/* Action Button matching Reference Image 5 */}
        <div className="pt-6">
          {user ? (
            <Link
              href={`/${locale}/account/ratings`}
              className="inline-flex items-center justify-center px-8 py-3 bg-black hover:bg-[#e03a3e] text-[#fef9c3] hover:text-white text-xs sm:text-sm font-mono font-black uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
            >
              {t("home.myRatingsBtn")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="inline-flex items-center justify-center px-8 py-3 bg-black hover:bg-[#e03a3e] text-[#fef9c3] hover:text-white text-xs sm:text-sm font-mono font-black uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
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
