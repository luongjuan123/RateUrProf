"use client";

import React from "react";

interface StudentAccountGraphicProps {
  className?: string;
  userName?: string;
}

/**
 * StudentAccountGraphic:
 * Hand-crafted Neo-Brutalist Pop-Art SVG illustration for the Student Account Portal.
 * Features 100% sharp corners, bold outlines, vivid colors, and student desk scenery.
 */
export const StudentAccountGraphic: React.FC<StudentAccountGraphicProps> = ({
  className = "",
  userName = "Student",
}) => {
  return (
    <div
      className={`relative overflow-hidden border-2 border-black bg-[#fef9c3] p-4 sm:p-6 shadow-[4px_4px_0px_#000] select-none ${className}`}
    >

      {/* Decorative Stamp Badges */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-1 bg-black text-[#fef9c3] font-mono font-black text-[10px] sm:text-xs uppercase tracking-wider border border-black shadow-[2px_2px_0px_#facc15]">
          ★ STUDENT PORTAL
        </span>
        <span className="px-2 py-0.5 bg-[#4ade80] text-black font-mono font-black text-[10px] sm:text-xs uppercase border border-black shadow-[1.5px_1.5px_0px_#000]">
          VERIFIED ACCOUNT
        </span>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 pt-7 md:pt-0">
        {/* Left Side: Editorial Typography & Greeting */}
        <div className="space-y-2 text-center md:text-left max-w-lg">
          <div className="inline-block px-2 py-0.5 bg-white border border-black shadow-[1.5px_1.5px_0px_#000] text-[10px] font-mono font-black uppercase text-black">
            Bảng điều khiển cá nhân
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-black text-black tracking-tight leading-tight">
            Xin chào, {userName}!
          </h2>
          <p className="text-xs sm:text-sm font-mono font-bold text-gray-800 leading-relaxed">
            Quản lý thông tin hồ sơ sinh viên, theo dõi đánh giá đã gửi và danh sách giảng viên yêu thích của bạn.
          </p>
        </div>

        {/* Right Side: The Student Desk & Character SVG Drawing */}
        <div className="w-full md:w-[380px] lg:w-[420px] shrink-0">
          <svg
            viewBox="0 0 420 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto drop-shadow-[3px_3px_0px_#000]"
          >
            {/* Ground / Desk Line */}
            <line x1="20" y1="162" x2="400" y2="162" stroke="#111111" strokeWidth="3" />
            <line x1="30" y1="168" x2="390" y2="168" stroke="#111111" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Laptop / Screen on Desk */}
            <g transform="translate(190, 75)">
              {/* Laptop Screen Shadow */}
              <rect x="5" y="5" width="100" height="70" fill="#111111" />
              {/* Screen Body */}
              <rect x="0" y="0" width="100" height="70" fill="#1e293b" stroke="#111111" strokeWidth="2.5" />
              {/* Inner Display (Bright Cyan) */}
              <rect x="6" y="6" width="88" height="58" fill="#e0f2fe" stroke="#111111" strokeWidth="1.5" />
              {/* Code / Content stripes on screen */}
              <rect x="12" y="14" width="40" height="4" fill="#38bdf8" />
              <rect x="12" y="22" width="60" height="4" fill="#facc15" />
              <rect x="12" y="30" width="30" height="4" fill="#4ade80" />
              <rect x="12" y="38" width="50" height="4" fill="#f43f5e" />
              {/* Mini RUP Logo on Screen */}
              <rect x="68" y="12" width="22" height="12" fill="#111111" stroke="#fef9c3" strokeWidth="1" />
              <text x="79" y="21" fill="#fef9c3" fontSize="8" fontWeight="900" fontFamily="monospace" textAnchor="middle">RUP</text>
              {/* Laptop Keyboard Base */}
              <polygon points="-12,70 112,70 120,85 -20,85" fill="#cbd5e1" stroke="#111111" strokeWidth="2" />
              <rect x="25" y="74" width="50" height="7" fill="#94a3b8" stroke="#111111" strokeWidth="1" />
            </g>

            {/* Student Character on Left */}
            <g transform="translate(60, 45)">
              {/* Head & Cap */}
              <rect x="35" y="10" width="22" height="22" fill="#fed7aa" stroke="#111111" strokeWidth="2" />
              {/* Blue Baseball Cap */}
              <polygon points="30,10 60,10 58,0 32,0" fill="#0284c7" stroke="#111111" strokeWidth="2" />
              <rect x="24" y="8" width="20" height="4" fill="#0284c7" stroke="#111111" strokeWidth="1.5" />
              {/* Cool Sunglasses */}
              <rect x="33" y="18" width="10" height="5" fill="#111111" />
              <rect x="46" y="18" width="10" height="5" fill="#111111" />
              <line x1="43" y1="20" x2="46" y2="20" stroke="#111111" strokeWidth="1.5" />
              {/* Smile */}
              <line x1="40" y1="27" x2="49" y2="27" stroke="#111111" strokeWidth="1.5" strokeLinecap="square" />

              {/* Yellow Sweater */}
              <rect x="26" y="32" width="40" height="42" fill="#facc15" stroke="#111111" strokeWidth="2.5" />
              {/* Striped collar */}
              <line x1="38" y1="32" x2="54" y2="32" stroke="#e03a3e" strokeWidth="3" />

              {/* Student ID Badge hanging */}
              <line x1="46" y1="32" x2="46" y2="48" stroke="#111111" strokeWidth="1.5" />
              <rect x="38" y="48" width="16" height="20" fill="#ffffff" stroke="#111111" strokeWidth="1.5" />
              <rect x="41" y="52" width="10" height="6" fill="#38bdf8" />
              <line x1="41" y1="62" x2="51" y2="62" stroke="#111111" strokeWidth="1" />

              {/* Arm reaching toward laptop */}
              <path d="M66 42 L105 60 L130 75" stroke="#facc15" strokeWidth="8" strokeLinecap="square" />
              <rect x="126" y="72" width="8" height="8" fill="#fed7aa" stroke="#111111" strokeWidth="1.5" />
            </g>

            {/* Stack of Textbooks on Right */}
            <g transform="translate(315, 80)">
              {/* Bottom Book: Coral */}
              <rect x="0" y="55" width="85" height="15" fill="#f43f5e" stroke="#111111" strokeWidth="2" />
              <line x1="10" y1="55" x2="10" y2="70" stroke="#fbcfe8" strokeWidth="2" />

              {/* Middle Book: Emerald Green */}
              <rect x="6" y="42" width="75" height="14" fill="#10b981" stroke="#111111" strokeWidth="2" />
              <line x1="16" y1="42" x2="16" y2="56" stroke="#a7f3d0" strokeWidth="2" />

              {/* Top Book: Sunny Yellow */}
              <rect x="12" y="30" width="65" height="13" fill="#facc15" stroke="#111111" strokeWidth="2" />
              <line x1="20" y1="30" x2="20" y2="43" stroke="#fef08a" strokeWidth="2" />

              {/* Steaming Coffee Mug on top of books */}
              <rect x="32" y="8" width="18" height="22" fill="#38bdf8" stroke="#111111" strokeWidth="2" />
              <path d="M50 12 H55 V22 H50" stroke="#111111" strokeWidth="2" fill="none" />
              {/* Steam swirl */}
              <path d="M37 2 C37 -2, 42 -2, 42 -6" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="square" fill="none" />
            </g>

            {/* Checklist Clipboard on Left */}
            <g transform="translate(15, 95)">
              <rect x="0" y="0" width="38" height="52" fill="#ffffff" stroke="#111111" strokeWidth="2" />
              <rect x="10" y="-5" width="18" height="8" fill="#111111" />
              {/* Checkmarks */}
              <text x="6" y="16" fill="#16a34a" fontSize="10" fontWeight="900">✓</text>
              <line x1="18" y1="13" x2="32" y2="13" stroke="#111111" strokeWidth="1.5" />
              <text x="6" y="28" fill="#16a34a" fontSize="10" fontWeight="900">✓</text>
              <line x1="18" y1="25" x2="30" y2="25" stroke="#111111" strokeWidth="1.5" />
              <text x="6" y="40" fill="#16a34a" fontSize="10" fontWeight="900">✓</text>
              <line x1="18" y1="37" x2="28" y2="37" stroke="#111111" strokeWidth="1.5" />
            </g>

            {/* Floating Pop-art Sparkle Stars */}
            <g transform="translate(160, 20)">
              <polygon points="6,0 8,4 12,6 8,8 6,12 4,8 0,6 4,4" fill="#facc15" stroke="#111111" strokeWidth="1.5" />
            </g>
            <g transform="translate(300, 30)">
              <polygon points="5,0 7,3 10,5 7,7 5,10 3,7 0,5 3,3" fill="#ec4899" stroke="#111111" strokeWidth="1.5" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
