"use client";

import React from "react";

interface CampusGraphicProps {
  className?: string;
  variant?: "hero" | "compact" | "banner";
  schoolName?: string;
  shortName?: string;
}

/**
 * CampusGraphic:
 * Minimalist Blue & White vector illustration of university campus life.
 * 100% flat aesthetic, 0px border-radius, 1px border.
 */
export const CampusGraphic: React.FC<CampusGraphicProps> = ({
  className = "",
  variant = "hero",
  schoolName = "Đại Học",
  shortName = "CAMPUS",
}) => {
  if (variant === "compact") {
    return (
      <div className={`relative select-none ${className}`}>
        <svg
          viewBox="0 0 200 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto text-[#1d4ed8]"
        >
          <rect x="15" y="15" width="170" height="135" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
          <rect x="25" y="25" width="150" height="115" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="3 3" />

          {/* Clock Tower / Main Academic Hall */}
          <g transform="translate(45, 30)">
            <rect x="35" y="15" width="40" height="75" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
            <polygon points="35,15 55,0 75,15" fill="#1e40af" stroke="#1d4ed8" strokeWidth="1.5" />
            <line x1="55" y1="0" x2="55" y2="-12" stroke="#1d4ed8" strokeWidth="1.5" />
            <polygon points="55,-12 72,-7 55,-2" fill="#1d4ed8" stroke="#1d4ed8" strokeWidth="1" />
            <rect x="47" y="22" width="16" height="16" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1" />
            <line x1="55" y1="30" x2="55" y2="25" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="square" />
            <line x1="55" y1="30" x2="60" y2="30" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="square" />
            <rect x="42" y="46" width="6" height="24" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1" />
            <rect x="62" y="46" width="6" height="24" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1" />
            <rect x="51" y="60" width="8" height="30" fill="#1d4ed8" />
          </g>

          <polygon points="25,120 40,85 55,120" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5" />
          <line x1="40" y1="120" x2="40" y2="135" stroke="#1d4ed8" strokeWidth="2" />

          <rect x="80" y="120" width="55" height="18" fill="#1d4ed8" stroke="#1d4ed8" strokeWidth="1" />
          <text x="107" y="132" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
            {shortName.slice(0, 7)}
          </text>
        </svg>
      </div>
    );
  }

  // Hero / Banner variant
  return (
    <div className={`relative overflow-hidden border border-blue-200 bg-blue-50/50 p-4 sm:p-6 select-none ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3 relative z-10 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-[#1d4ed8] text-white font-mono font-bold text-[10px] sm:text-xs uppercase tracking-wider">
            ★ HỒ SƠ ĐẠI HỌC
          </span>
          <span className="px-2 py-0.5 bg-white text-[#1d4ed8] font-mono font-bold text-[10px] sm:text-xs uppercase border border-blue-200">
            {shortName}
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 bg-white text-slate-700 font-mono font-bold text-[10px] border border-gray-200">
          RateUrProfs Verified
        </span>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left max-w-lg">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-bold text-slate-900 tracking-tight leading-tight">
            {schoolName}
          </h2>
          <p className="text-xs sm:text-sm font-mono text-slate-600 leading-relaxed">
            Khám phá đánh giá khách quan về cơ sở vật chất, chất lượng đào tạo, câu lạc bộ và đời sống sinh viên.
          </p>
        </div>

        <div className="w-full md:w-[320px] shrink-0">
          <svg viewBox="0 0 320 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto text-[#1d4ed8]">
            <line x1="10" y1="105" x2="310" y2="105" stroke="#1d4ed8" strokeWidth="1.5" />
            <g transform="translate(100, 10)">
              <rect x="35" y="25" width="50" height="70" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
              <polygon points="35,25 60,10 85,25" fill="#1e40af" stroke="#1d4ed8" strokeWidth="1.5" />
              <rect x="48" y="35" width="24" height="20" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1" />
              <rect x="53" y="70" width="14" height="25" fill="#1d4ed8" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
