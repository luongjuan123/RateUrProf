"use client";

import React from "react";

interface LecturerGraphicProps {
  className?: string;
  variant?: "hero" | "compact" | "badge";
  professorName?: string;
}

/**
 * LecturerGraphic:
 * Hand-drawn Neo-Brutalist Pop-Art SVG illustration of academic teaching & research.
 * Strictly 100% sharp-cornered (no rounded corners), bold black outlines,
 * vivid colors and playful chalkboard, books, graduation cap, and apple doodles.
 */
export const LecturerGraphic: React.FC<LecturerGraphicProps> = ({
  className = "",
  variant = "hero",
  professorName = "Giảng Viên",
}) => {
  if (variant === "compact") {
    return (
      <div className={`relative select-none ${className}`}>
        <svg
          viewBox="0 0 160 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto drop-shadow-[3px_3px_0px_#000]"
        >
          {/* Background card */}
          <rect x="10" y="10" width="140" height="120" fill="#fef9c3" stroke="#111111" strokeWidth="2.5" />
          {/* Mini Chalkboard */}
          <rect x="25" y="20" width="110" height="70" fill="#1e293b" stroke="#111111" strokeWidth="2" />
          <line x1="35" y1="35" x2="65" y2="35" stroke="#fef08a" strokeWidth="2" strokeDasharray="3 3" />
          <line x1="35" y1="45" x2="85" y2="45" stroke="#6ee7b7" strokeWidth="2" strokeDasharray="4 2" />
          <text x="105" y="48" fill="#f43f5e" fontSize="16" fontWeight="900" fontFamily="monospace">A+</text>
          {/* Stack of books */}
          <rect x="30" y="90" width="55" height="8" fill="#f87171" stroke="#111111" strokeWidth="1.5" />
          <rect x="25" y="98" width="65" height="9" fill="#38bdf8" stroke="#111111" strokeWidth="1.5" />
          <rect x="20" y="107" width="75" height="11" fill="#4ade80" stroke="#111111" strokeWidth="2" />
          {/* Graduation Cap */}
          <polygon points="105,85 125,75 145,85 125,95" fill="#111111" stroke="#111111" strokeWidth="1.5" />
          <rect x="117" y="92" width="16" height="8" fill="#111111" />
          <line x1="125" y1="85" x2="140" y2="95" stroke="#facc15" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  // Hero / Card Header Scene
  return (
    <div className={`relative overflow-hidden border-2 border-black bg-[#fef9c3] p-4 sm:p-5 shadow-[4px_4px_0px_#000] select-none ${className}`}>

      {/* Top Banner Tags */}
      <div className="flex items-center justify-between gap-2 mb-3 relative z-10 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-black text-[#facc15] font-mono font-black text-[10px] sm:text-xs uppercase tracking-wider border border-black shadow-[2px_2px_0px_#e03a3e]">
            ★ HỒ SƠ GIẢNG VIÊN
          </span>
          <span className="px-2 py-0.5 bg-[#fee2e2] text-[#991b1b] font-mono font-black text-[10px] sm:text-xs uppercase border border-black shadow-[1.5px_1.5px_0px_#000]">
            ACADEMIC PROFILE
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 bg-white text-black font-mono font-bold text-[10px] border border-black shadow-[1px_1px_0px_#000]">
          RateUrProfs Verified
        </span>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Side: Friendly Prompt / Subtitle */}
        <div className="space-y-1.5 text-center md:text-left">
          <div className="text-xs sm:text-sm font-mono font-black text-black">
            Góc nhìn chân thực từ sinh viên từng theo học
          </div>
          <p className="text-[11px] sm:text-xs font-mono font-bold text-gray-700 max-w-md">
            Đánh giá phương pháp giảng dạy, độ khó bài tập, tiêu chí chấm thi và mức độ tận tâm của giảng viên.
          </p>
        </div>

        {/* Right Side: The Academic Chalkboard & Desk Drawing */}
        <div className="w-full md:w-[360px] lg:w-[420px] shrink-0">
          <svg
            viewBox="0 0 420 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto drop-shadow-[3px_3px_0px_#000]"
          >
            {/* Ground / Desk Surface Line */}
            <line x1="20" y1="162" x2="400" y2="162" stroke="#111111" strokeWidth="3" />
            <line x1="30" y1="168" x2="390" y2="168" stroke="#111111" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Chalkboard */}
            <g id="chalkboard" transform="translate(40, 15)">
              {/* Board Shadow */}
              <rect x="8" y="8" width="220" height="110" fill="#111111" />
              {/* Wooden Frame */}
              <rect x="0" y="0" width="220" height="110" fill="#f59e0b" stroke="#111111" strokeWidth="2.5" />
              {/* Inner Slate Green/Black */}
              <rect x="10" y="10" width="200" height="90" fill="#1e293b" stroke="#111111" strokeWidth="2" />

              {/* Chalk Writings / Math Formulas & Doodles */}
              {/* Formula: E = mc² */}
              <text x="25" y="36" fill="#fef08a" fontSize="13" fontWeight="900" fontFamily="monospace">
                E = mc²
              </text>
              {/* Formula: ∫ f(x) dx */}
              <text x="25" y="60" fill="#6ee7b7" fontSize="11" fontWeight="800" fontFamily="monospace">
                ∫ f(x)dx = F(x)
              </text>
              {/* Grade A+ with box */}
              <rect x="150" y="20" width="45" height="32" fill="#ef4444" stroke="#111111" strokeWidth="2" />
              <text x="172" y="42" fill="#ffffff" fontSize="18" fontWeight="900" fontFamily="monospace" textAnchor="middle">
                A+
              </text>
              {/* 10/10 Score stamp */}
              <text x="25" y="86" fill="#38bdf8" fontSize="13" fontWeight="900" fontFamily="monospace">
                SCORE: 5.0 ★
              </text>

              {/* Chalk Ledge */}
              <rect x="12" y="100" width="196" height="6" fill="#d97706" stroke="#111111" strokeWidth="1.5" />
              {/* Pieces of white & yellow chalk */}
              <rect x="40" y="97" width="12" height="4" fill="#ffffff" stroke="#111111" strokeWidth="1" />
              <rect x="60" y="97" width="10" height="4" fill="#facc15" stroke="#111111" strokeWidth="1" />
              {/* Chalk Eraser */}
              <rect x="120" y="95" width="22" height="7" fill="#111111" stroke="#ffffff" strokeWidth="1" />
            </g>

            {/* Books Stack on Desk */}
            <g id="books-stack" transform="translate(280, 75)">
              {/* Bottom Book: Vibrant Green */}
              <rect x="0" y="60" width="95" height="15" fill="#22c55e" stroke="#111111" strokeWidth="2.5" />
              <line x1="12" y1="60" x2="12" y2="75" stroke="#ffffff" strokeWidth="2" />
              <rect x="25" y="64" width="45" height="7" fill="#dcfce7" stroke="#111111" strokeWidth="1" />

              {/* Middle Book: Sky Blue */}
              <rect x="8" y="46" width="82" height="14" fill="#0284c7" stroke="#111111" strokeWidth="2.5" />
              <line x1="20" y1="46" x2="20" y2="60" stroke="#bae6fd" strokeWidth="2" />

              {/* Top Book: Coral Red */}
              <rect x="15" y="33" width="70" height="13" fill="#f43f5e" stroke="#111111" strokeWidth="2" />
              <line x1="26" y1="33" x2="26" y2="46" stroke="#fbcfe8" strokeWidth="1.5" />

              {/* Graduation Cap on top of books */}
              <polygon points="50,0 12,14 50,26 88,14" fill="#111111" stroke="#111111" strokeWidth="2" />
              <rect x="36" y="20" width="28" height="14" fill="#1e293b" stroke="#111111" strokeWidth="2" />
              {/* Gold Tassel */}
              <circle cx="50" cy="13" r="2.5" fill="#facc15" />
              <line x1="50" y1="13" x2="72" y2="24" stroke="#facc15" strokeWidth="2" />
              <polygon points="72,24 76,28 70,28" fill="#facc15" stroke="#111111" strokeWidth="1" />
            </g>

            {/* Red Apple on Left of books */}
            <g transform="translate(245, 125)">
              {/* Apple body (Sharp neo-brutalist style) */}
              <polygon points="14,10 26,10 32,20 28,34 12,34 8,20" fill="#ef4444" stroke="#111111" strokeWidth="2" />
              {/* Stem */}
              <line x1="20" y1="10" x2="20" y2="3" stroke="#451a03" strokeWidth="2.5" />
              {/* Green Leaf */}
              <polygon points="20,5 28,2 25,7" fill="#4ade80" stroke="#111111" strokeWidth="1" />
            </g>

            {/* Steaming Mug on Right */}
            <g transform="translate(378, 122)">
              {/* Mug Body */}
              <rect x="0" y="10" width="24" height="28" fill="#facc15" stroke="#111111" strokeWidth="2" />
              {/* Mug Handle */}
              <path d="M24 14 H30 V28 H24" stroke="#111111" strokeWidth="2" fill="none" />
              {/* Mug Star Logo */}
              <rect x="8" y="18" width="8" height="8" fill="#111111" />
              {/* Steam Swirls */}
              <path d="M6 5 C6 2, 10 2, 10 -2" stroke="#64748b" strokeWidth="1.5" strokeLinecap="square" fill="none" />
              <path d="M14 6 C14 3, 18 3, 18 -1" stroke="#64748b" strokeWidth="1.5" strokeLinecap="square" fill="none" />
            </g>

            {/* Pop-art Lightbulb (Eureka!) floating */}
            <g transform="translate(15, 20)">
              {/* Glow rays */}
              <line x1="12" y1="-5" x2="12" y2="-1" stroke="#ca8a04" strokeWidth="2" />
              <line x1="-3" y1="4" x2="1" y2="7" stroke="#ca8a04" strokeWidth="2" />
              <line x1="27" y1="4" x2="23" y2="7" stroke="#ca8a04" strokeWidth="2" />
              {/* Bulb */}
              <polygon points="6,10 18,10 22,18 16,24 8,24 2,18" fill="#fde047" stroke="#111111" strokeWidth="2" />
              <rect x="8" y="24" width="8" height="5" fill="#94a3b8" stroke="#111111" strokeWidth="1.5" />
              <text x="12" y="19" fill="#111111" fontSize="9" fontWeight="900" textAnchor="middle">💡</text>
            </g>

            {/* Angled Pop-art Pencil */}
            <g transform="translate(20, 140) rotate(-15)">
              <rect x="0" y="0" width="38" height="8" fill="#facc15" stroke="#111111" strokeWidth="1.5" />
              <polygon points="38,0 48,4 38,8" fill="#fed7aa" stroke="#111111" strokeWidth="1.5" />
              <polygon points="45,3 48,4 45,5" fill="#111111" />
              <rect x="-8" y="0" width="8" height="8" fill="#f43f5e" stroke="#111111" strokeWidth="1.5" />
            </g>

            {/* Pop-art Sparkle Stars */}
            <g transform="translate(270, 25)">
              <polygon points="6,0 8,4 12,6 8,8 6,12 4,8 0,6 4,4" fill="#a855f7" stroke="#111111" strokeWidth="1.5" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
