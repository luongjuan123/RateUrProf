"use client";

import React from "react";

interface LecturerGraphicProps {
  className?: string;
  variant?: "hero" | "compact" | "badge";
  professorName?: string;
}

/**
 * LecturerGraphic:
 * Minimalist Blue & White vector illustration of academic teaching & research.
 * 100% flat aesthetic, 0px border-radius, 1px border.
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
          className="w-full h-auto text-[#1d4ed8]"
        >
          <rect x="10" y="10" width="140" height="120" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
          <rect x="25" y="20" width="110" height="70" fill="#1e40af" stroke="#1d4ed8" strokeWidth="1" />
          <line x1="35" y1="35" x2="65" y2="35" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="35" y1="45" x2="85" y2="45" stroke="#bfdbfe" strokeWidth="1.5" strokeDasharray="4 2" />
          <text x="105" y="48" fill="#ffffff" fontSize="16" fontWeight="bold" fontFamily="monospace">A+</text>
          <rect x="30" y="90" width="55" height="8" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1" />
          <rect x="25" y="98" width="65" height="9" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1" />
          <rect x="20" y="107" width="75" height="11" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
          <polygon points="105,85 125,75 145,85 125,95" fill="#1d4ed8" stroke="#1d4ed8" strokeWidth="1" />
          <rect x="117" y="92" width="16" height="8" fill="#1d4ed8" />
          <line x1="125" y1="85" x2="140" y2="95" stroke="#93c5fd" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }

  // Hero / Card Header Scene
  return (
    <div className={`relative overflow-hidden border border-blue-200 bg-blue-50/50 p-4 sm:p-5 select-none ${className}`}>
      {/* Top Banner Tags */}
      <div className="flex items-center justify-between gap-2 mb-3 relative z-10 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-[#1d4ed8] text-white font-mono font-bold text-[10px] sm:text-xs uppercase tracking-wider">
            ★ HỒ SƠ GIẢNG VIÊN
          </span>
          <span className="px-2 py-0.5 bg-white text-[#1d4ed8] font-mono font-bold text-[10px] sm:text-xs uppercase border border-blue-200">
            ACADEMIC PROFILE
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 bg-white text-slate-700 font-mono font-bold text-[10px] border border-gray-200">
          RateUrProfs Verified
        </span>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Side: Subtitle */}
        <div className="space-y-1.5 text-center md:text-left">
          <div className="text-xs sm:text-sm font-mono font-bold text-slate-900">
            Góc nhìn chân thực từ sinh viên từng theo học {professorName}
          </div>
          <p className="text-[11px] sm:text-xs font-mono text-slate-600 max-w-md">
            Đánh giá phương pháp giảng dạy, độ khó bài tập, tiêu chí chấm thi và mức độ tận tâm của giảng viên.
          </p>
        </div>

        {/* Right Side: Vector SVG */}
        <div className="w-full md:w-[320px] shrink-0">
          <svg
            viewBox="0 0 320 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto text-[#1d4ed8]"
          >
            <line x1="10" y1="105" x2="310" y2="105" stroke="#1d4ed8" strokeWidth="1.5" />
            <rect x="30" y="20" width="120" height="70" fill="#1e40af" stroke="#1d4ed8" strokeWidth="1.5" />
            <text x="90" y="55" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace" textAnchor="middle">LECTURE</text>
            <g transform="translate(180, 45)">
              <rect x="0" y="40" width="45" height="10" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1" />
              <rect x="-5" y="50" width="55" height="10" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1" />
              <polygon points="60,20 80,10 100,20 80,30" fill="#1d4ed8" />
              <rect x="72" y="27" width="16" height="8" fill="#1d4ed8" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
