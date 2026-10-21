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
 * Playful Neo-Brutalist pop-art drawings for empty review states.
 * Features 100% sharp corners, bold outlines, and colorful comic energy.
 */
export const EmptyStateGraphic: React.FC<EmptyStateGraphicProps> = ({
  className = "",
  type = "school",
  title,
  subtitle,
}) => {
  if (type === "school") {
    return (
      <div className={`p-8 sm:p-12 text-center bg-[#fef9c3]/40 border-2 border-black shadow-[4px_4px_0px_#000] space-y-4 select-none ${className}`}>
        {/* The Illustrated Megaphone & Student Scene */}
        <div className="w-48 sm:w-56 mx-auto">
          <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-[2px_2px_0px_#000]">
            {/* Pop-art Confetti floating */}
            <rect x="25" y="20" width="8" height="8" fill="#f43f5e" stroke="#111111" strokeWidth="1.5" transform="rotate(15 25 20)" />
            <rect x="160" y="25" width="10" height="6" fill="#38bdf8" stroke="#111111" strokeWidth="1.5" transform="rotate(-20 160 25)" />
            <polygon points="175,70 180,60 185,70" fill="#facc15" stroke="#111111" strokeWidth="1.5" />
            <rect x="35" y="80" width="7" height="7" fill="#4ade80" stroke="#111111" strokeWidth="1.5" />

            {/* Megaphone (Pop-art bullhorn) */}
            <g transform="translate(60, 35)">
              {/* Sound waves / speech bursts */}
              <polygon points="90,15 115,-5 110,15" fill="#fde047" stroke="#111111" strokeWidth="1.5" />
              <polygon points="95,40 120,40 100,50" fill="#f87171" stroke="#111111" strokeWidth="1.5" />
              <polygon points="90,65 115,80 105,65" fill="#60a5fa" stroke="#111111" strokeWidth="1.5" />

              {/* Megaphone Cone */}
              <polygon points="35,30 85,10 85,70 35,50" fill="#e03a3e" stroke="#111111" strokeWidth="2.5" strokeLinejoin="round" />
              <polygon points="85,10 92,5 92,75 85,70" fill="#facc15" stroke="#111111" strokeWidth="2" />
              {/* Back Cylinder */}
              <rect x="15" y="32" width="20" height="16" fill="#111111" stroke="#111111" strokeWidth="2" />
              {/* Handle */}
              <path d="M28 48 L22 75 L32 75 L38 48" fill="#0284c7" stroke="#111111" strokeWidth="2" />
            </g>

            {/* Mini Student on Left holding the megaphone */}
            <g transform="translate(25, 65)">
              {/* Head */}
              <rect x="18" y="0" width="14" height="14" fill="#fed7aa" stroke="#111111" strokeWidth="2" />
              <polygon points="16,0 34,0 30,6 18,5" fill="#3b2d20" stroke="#111111" strokeWidth="1.5" />
              {/* Torso */}
              <rect x="14" y="14" width="22" height="26" fill="#3b82f6" stroke="#111111" strokeWidth="2" />
              {/* Arm pointing forward */}
              <line x1="28" y1="22" x2="48" y2="28" stroke="#3b82f6" strokeWidth="5" strokeLinecap="square" />
              <rect x="46" y="26" width="6" height="6" fill="#fed7aa" stroke="#111111" strokeWidth="1.5" />
              {/* Legs */}
              <rect x="16" y="40" width="8" height="22" fill="#1e293b" stroke="#111111" strokeWidth="2" />
              <rect x="26" y="40" width="8" height="22" fill="#0f172a" stroke="#111111" strokeWidth="2" />
              {/* Shoes */}
              <rect x="12" y="60" width="12" height="5" fill="#f43f5e" stroke="#111111" strokeWidth="1.5" />
              <rect x="26" y="60" width="12" height="5" fill="#f43f5e" stroke="#111111" strokeWidth="1.5" />
            </g>
          </svg>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-1.5 max-w-md mx-auto">
          <div className="inline-block px-2.5 py-0.5 bg-[#facc15] text-black font-mono font-black text-[11px] uppercase tracking-wider border border-black shadow-[1.5px_1.5px_0px_#000]">
            ★ TIÊN PHONG CHIA SẺ
          </div>
          <h4 className="font-mono font-black text-black text-base sm:text-lg uppercase tracking-tight">
            {title || "Chưa có đánh giá nào cho trường này"}
          </h4>
          <p className="text-xs font-mono text-gray-700 font-bold leading-relaxed">
            {subtitle || "Hãy là sinh viên đầu tiên chia sẻ cảm nhận chân thực về cơ sở vật chất, đời sống học đường và giảng viên!"}
          </p>
        </div>
      </div>
    );
  }

  // Professor Empty State
  return (
    <div className={`p-8 sm:p-12 text-center bg-[#ede9fe]/40 border-2 border-black shadow-[4px_4px_0px_#000] space-y-4 select-none ${className}`}>
      {/* Chalkboard & Desk Drawing */}
      <div className="w-48 sm:w-56 mx-auto">
        <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-[2px_2px_0px_#000]">
          {/* Desk line */}
          <line x1="20" y1="130" x2="180" y2="130" stroke="#111111" strokeWidth="2.5" />

          {/* Chalkboard with empty note */}
          <rect x="40" y="20" width="120" height="75" fill="#f59e0b" stroke="#111111" strokeWidth="2" />
          <rect x="48" y="28" width="104" height="59" fill="#1e293b" stroke="#111111" strokeWidth="1.5" />
          <text x="100" y="55" fill="#fef08a" fontSize="11" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            CHƯA CÓ REVIEW
          </text>
          <text x="100" y="72" fill="#6ee7b7" fontSize="10" fontWeight="700" fontFamily="monospace" textAnchor="middle">
            GỬI ĐÁNH GIÁ NGAY!
          </text>

          {/* Notebook & Pen on desk */}
          <rect x="45" y="112" width="45" height="18" fill="#fef9c3" stroke="#111111" strokeWidth="2" />
          <line x1="45" y1="117" x2="90" y2="117" stroke="#38bdf8" strokeWidth="1" />
          <line x1="45" y1="122" x2="90" y2="122" stroke="#38bdf8" strokeWidth="1" />
          {/* Pen */}
          <rect x="98" y="120" width="28" height="5" fill="#ef4444" stroke="#111111" strokeWidth="1.5" transform="rotate(-10 98 120)" />

          {/* Apple */}
          <polygon points="145,115 155,115 160,122 157,130 143,130 140,122" fill="#ef4444" stroke="#111111" strokeWidth="1.5" />
          <line x1="150" y1="115" x2="150" y2="110" stroke="#451a03" strokeWidth="2" />

          {/* Sparkles */}
          <polygon points="25,40 28,34 34,32 28,30 25,24 22,30 16,32 22,34" fill="#facc15" stroke="#111111" strokeWidth="1" />
          <polygon points="175,35 178,29 184,27 178,25 175,19 172,25 166,27 172,29" fill="#f43f5e" stroke="#111111" strokeWidth="1" />
        </svg>
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <div className="inline-block px-2.5 py-0.5 bg-[#4ade80] text-black font-mono font-black text-[11px] uppercase tracking-wider border border-black shadow-[1.5px_1.5px_0px_#000]">
          ★ Ý KIẾN CỦA BẠN RẤT QUAN TRỌNG
        </div>
        <h4 className="font-mono font-black text-black text-base sm:text-lg uppercase tracking-tight">
          {title || "Chưa có đánh giá nào cho giảng viên này"}
        </h4>
        <p className="text-xs font-mono text-gray-700 font-bold leading-relaxed">
          {subtitle || "Hãy là sinh viên đầu tiên chia sẻ trải nghiệm về phong cách giảng dạy, độ khó bài tập và tính cách của thầy cô!"}
        </p>
      </div>
    </div>
  );
};
