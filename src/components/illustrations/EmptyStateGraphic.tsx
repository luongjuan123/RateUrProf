"use client";

import React from "react";

interface EmptyStateGraphicProps {
  className?: string;
  type?: "school" | "professor";
  title?: string;
  subtitle?: string;
}

/**
 * EmptyStateGraphic:
 * Minimalist Blue & White vector illustration for empty review states.
 * 100% flat aesthetic, 0px border-radius, 1px border.
 */
export const EmptyStateGraphic: React.FC<EmptyStateGraphicProps> = ({
  className = "",
  type = "school",
  title,
  subtitle,
}) => {
  if (type === "school") {
    return (
      <div className={`p-8 sm:p-12 text-center bg-blue-50/40 border border-blue-200 space-y-4 select-none ${className}`}>
        <div className="w-48 sm:w-56 mx-auto">
          <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto text-[#1d4ed8]">
            <rect x="25" y="20" width="8" height="8" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5" transform="rotate(15 25 20)" />
            <rect x="160" y="25" width="10" height="6" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" transform="rotate(-20 160 25)" />
            <polygon points="175,70 180,60 185,70" fill="#bfdbfe" stroke="#1d4ed8" strokeWidth="1.5" />
            <rect x="35" y="80" width="7" height="7" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5" />

            <g transform="translate(60, 35)">
              <polygon points="35,30 85,10 85,70 35,50" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="2" strokeLinejoin="round" />
              <polygon points="85,10 92,5 92,75 85,70" fill="#1d4ed8" stroke="#1d4ed8" strokeWidth="1.5" />
              <rect x="15" y="32" width="20" height="16" fill="#1d4ed8" stroke="#1d4ed8" strokeWidth="1.5" />
              <path d="M28 48 L22 75 L32 75 L38 48" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
            </g>

            <g transform="translate(25, 65)">
              <rect x="18" y="0" width="14" height="14" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
              <polygon points="16,0 34,0 30,6 18,5" fill="#1d4ed8" stroke="#1d4ed8" strokeWidth="1.5" />
              <rect x="14" y="14" width="22" height="26" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
              <line x1="28" y1="22" x2="48" y2="28" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="square" />
              <rect x="16" y="40" width="8" height="22" fill="#1d4ed8" stroke="#1d4ed8" strokeWidth="1.5" />
              <rect x="26" y="40" width="8" height="22" fill="#1e40af" stroke="#1d4ed8" strokeWidth="1.5" />
              <rect x="12" y="60" width="12" height="5" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
              <rect x="26" y="60" width="12" height="5" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
            </g>
          </svg>
        </div>

        <div className="space-y-1.5 max-w-md mx-auto">
          <div className="inline-block px-2.5 py-0.5 bg-[#1d4ed8] text-white font-mono font-bold text-[11px] uppercase tracking-wider">
            ★ TIÊN PHONG CHIA SẺ
          </div>
          <h4 className="font-mono font-bold text-slate-900 text-base sm:text-lg uppercase tracking-tight">
            {title || "Chưa có đánh giá nào cho trường này"}
          </h4>
          <p className="text-xs font-mono text-slate-600 leading-relaxed">
            {subtitle || "Hãy là sinh viên đầu tiên chia sẻ cảm nhận chân thực về cơ sở vật chất, đời sống học đường và giảng viên!"}
          </p>
        </div>
      </div>
    );
  }

  // Professor Empty State
  return (
    <div className={`p-8 sm:p-12 text-center bg-blue-50/40 border border-blue-200 space-y-4 select-none ${className}`}>
      <div className="w-48 sm:w-56 mx-auto">
        <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto text-[#1d4ed8]">
          <line x1="20" y1="130" x2="180" y2="130" stroke="#1d4ed8" strokeWidth="2" />
          <rect x="40" y="20" width="120" height="75" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
          <rect x="48" y="28" width="104" height="59" fill="#1e40af" stroke="#1d4ed8" strokeWidth="1" />
          <text x="100" y="55" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
            CHƯA CÓ REVIEW
          </text>
          <line x1="60" y1="68" x2="140" y2="68" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="75" y1="75" x2="125" y2="75" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="4 2" />

          <g transform="translate(130, 95)">
            <rect x="0" y="20" width="30" height="8" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5" />
            <rect x="-4" y="28" width="38" height="7" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
          </g>

          <g transform="translate(45, 95)">
            <rect x="0" y="10" width="22" height="25" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
            <line x1="6" y1="0" x2="10" y2="10" stroke="#1d4ed8" strokeWidth="2" />
            <line x1="14" y1="-2" x2="14" y2="10" stroke="#1d4ed8" strokeWidth="2" />
          </g>
        </svg>
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <div className="inline-block px-2.5 py-0.5 bg-[#1d4ed8] text-white font-mono font-bold text-[11px] uppercase tracking-wider">
          ★ ĐÁNH GIÁ ĐẦU TIÊN
        </div>
        <h4 className="font-mono font-bold text-slate-900 text-base sm:text-lg uppercase tracking-tight">
          {title || "Chưa có đánh giá nào cho giảng viên này"}
        </h4>
        <p className="text-xs font-mono text-slate-600 leading-relaxed">
          {subtitle || "Bạn đã từng học lớp của thầy/cô? Hãy để lại bài đánh giá đầu tiên giúp các sinh viên khóa sau lựa chọn môn học phù hợp!"}
        </p>
      </div>
    </div>
  );
};
