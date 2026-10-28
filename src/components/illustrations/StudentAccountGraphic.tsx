"use client";

import React from "react";

interface StudentAccountGraphicProps {
  className?: string;
  userName?: string;
}

/**
 * StudentAccountGraphic:
 * Minimalist Blue & White vector illustration for the Student Account Portal.
 * 100% flat aesthetic, 0px border-radius, 1px border.
 */
export const StudentAccountGraphic: React.FC<StudentAccountGraphicProps> = ({
  className = "",
  userName = "Student",
}) => {
  return (
    <div
      className={`relative overflow-hidden border border-blue-200 bg-blue-50/50 p-4 sm:p-6 select-none ${className}`}
    >
      {/* Decorative Stamp Badges */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-1 bg-[#1d4ed8] text-white font-mono font-bold text-[10px] sm:text-xs uppercase tracking-wider">
          ★ STUDENT PORTAL
        </span>
        <span className="px-2 py-0.5 bg-white text-[#1d4ed8] font-mono font-bold text-[10px] sm:text-xs uppercase border border-blue-200">
          VERIFIED ACCOUNT
        </span>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 pt-7 md:pt-0">
        {/* Left Side: Typography & Greeting */}
        <div className="space-y-2 text-center md:text-left max-w-lg">
          <div className="inline-block px-2 py-0.5 bg-white border border-gray-200 text-[10px] font-mono font-bold uppercase text-slate-700">
            Bảng điều khiển cá nhân
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-bold text-slate-900 tracking-tight leading-tight">
            Xin chào, {userName}!
          </h2>
          <p className="text-xs sm:text-sm font-mono text-slate-600 leading-relaxed">
            Quản lý thông tin hồ sơ sinh viên, theo dõi đánh giá đã gửi và danh sách giảng viên yêu thích của bạn.
          </p>
        </div>

        {/* Right Side: The Student Desk & Character SVG Drawing */}
        <div className="w-full md:w-[380px] lg:w-[420px] shrink-0">
          <svg
            viewBox="0 0 420 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto text-[#1d4ed8]"
          >
            {/* Ground / Desk Line */}
            <line x1="20" y1="162" x2="400" y2="162" stroke="#1d4ed8" strokeWidth="2" />
            <line x1="30" y1="168" x2="390" y2="168" stroke="#93c5fd" strokeWidth="1" strokeDasharray="4 4" />

            {/* Laptop / Screen on Desk */}
            <g transform="translate(190, 75)">
              <rect x="0" y="0" width="100" height="70" fill="#1e40af" stroke="#1d4ed8" strokeWidth="2" />
              <rect x="6" y="6" width="88" height="58" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1" />
              <rect x="12" y="14" width="40" height="4" fill="#3b82f6" />
              <rect x="12" y="22" width="60" height="4" fill="#60a5fa" />
              <rect x="12" y="30" width="30" height="4" fill="#93c5fd" />
              <rect x="12" y="38" width="50" height="4" fill="#bfdbfe" />
              <rect x="68" y="12" width="22" height="12" fill="#1d4ed8" />
              <text x="79" y="21" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">RUP</text>
              <polygon points="-12,70 112,70 120,85 -20,85" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5" />
              <rect x="25" y="74" width="50" height="7" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1" />
            </g>

            {/* Student Silhouette */}
            <g transform="translate(50, 45)">
              <rect x="42" y="10" width="24" height="24" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2" />
              <polygon points="38,10 70,10 65,18 42,18" fill="#1d4ed8" />
              <rect x="36" y="34" width="36" height="55" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="2" />
              <line x1="58" y1="50" x2="110" y2="65" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="square" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
