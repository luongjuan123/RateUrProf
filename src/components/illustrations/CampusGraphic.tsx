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
 * Hand-drawn Neo-Brutalist Pop-Art SVG illustration of university campus life.
 * Complies with strict 100% sharp-corner rule (no rounded corners),
 * bold black 2px comic outlines, hard drop shadows, and vibrant pop colors.
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
          className="w-full h-auto drop-shadow-[3px_3px_0px_#000]"
        >
          {/* Background color blob / comic block */}
          <rect x="15" y="15" width="170" height="135" fill="#fef9c3" stroke="#111111" strokeWidth="2.5" />
          <rect x="25" y="25" width="150" height="115" fill="#e0f2fe" stroke="#111111" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Sun burst */}
          <polygon points="160,25 168,32 178,28 175,38 185,42 177,48 180,58 170,56 168,66 160,60 152,66 150,56 140,58 143,48 135,42 145,38 142,28 152,32" fill="#facc15" stroke="#111111" strokeWidth="1.5" />

          {/* Clock Tower / Main Academic Hall */}
          <g transform="translate(45, 30)">
            {/* Clock Tower Base */}
            <rect x="35" y="15" width="40" height="75" fill="#ffffff" stroke="#111111" strokeWidth="2" />
            <polygon points="35,15 55,0 75,15" fill="#f87171" stroke="#111111" strokeWidth="2" />
            {/* Pennant Flag */}
            <line x1="55" y1="0" x2="55" y2="-12" stroke="#111111" strokeWidth="2" />
            <polygon points="55,-12 72,-7 55,-2" fill="#e03a3e" stroke="#111111" strokeWidth="1.5" />
            {/* Clock */}
            <rect x="47" y="22" width="16" height="16" fill="#fef9c3" stroke="#111111" strokeWidth="1.5" />
            <line x1="55" y1="30" x2="55" y2="25" stroke="#111111" strokeWidth="1.5" strokeLinecap="square" />
            <line x1="55" y1="30" x2="60" y2="30" stroke="#111111" strokeWidth="1.5" strokeLinecap="square" />
            {/* Columns & Windows */}
            <rect x="42" y="46" width="6" height="24" fill="#6ee7b7" stroke="#111111" strokeWidth="1.5" />
            <rect x="62" y="46" width="6" height="24" fill="#6ee7b7" stroke="#111111" strokeWidth="1.5" />
            {/* Door */}
            <rect x="51" y="60" width="8" height="30" fill="#111111" />
          </g>

          {/* Pine Tree */}
          <polygon points="25,120 40,85 55,120" fill="#4ade80" stroke="#111111" strokeWidth="2" />
          <line x1="40" y1="120" x2="40" y2="135" stroke="#111111" strokeWidth="2.5" />

          {/* Stack of books */}
          <rect x="130" y="112" width="30" height="7" fill="#f43f5e" stroke="#111111" strokeWidth="1.5" />
          <rect x="127" y="119" width="35" height="7" fill="#38bdf8" stroke="#111111" strokeWidth="1.5" />
          <rect x="124" y="126" width="40" height="9" fill="#facc15" stroke="#111111" strokeWidth="2" />

          {/* Stamp tag */}
          <rect x="80" y="120" width="55" height="18" fill="#111111" stroke="#111111" strokeWidth="1.5" />
          <text x="107" y="132" fill="#fef9c3" fontSize="9" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            {shortName.slice(0, 7)}
          </text>
        </svg>
      </div>
    );
  }

  // Hero / Banner variant: Full rich campus panorama
  return (
    <div className={`relative overflow-hidden border-2 border-black bg-[#fef9c3] shadow-[4px_4px_0px_#000] p-4 sm:p-6 select-none ${className}`}>

      {/* Decorative Stamp Badges */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-1 bg-black text-[#fef9c3] font-mono font-black text-[10px] sm:text-xs uppercase tracking-wider border border-black shadow-[2px_2px_0px_#facc15]">
          ★ VIETNAM CAMPUS
        </span>
        <span className="px-2 py-0.5 bg-[#4ade80] text-black font-mono font-black text-[10px] sm:text-xs uppercase border border-black shadow-[1.5px_1.5px_0px_#000]">
          ACADEMIC HUB
        </span>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Side: Editorial Typography & School Tagline */}
        <div className="space-y-2 text-center md:text-left max-w-xl pt-7 md:pt-0">
          <div className="inline-block px-2 py-0.5 bg-white border border-black shadow-[2px_2px_0px_#000] text-[10px] font-mono font-black uppercase text-black">
            Cơ sở giáo dục đại học
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-mono font-black text-black tracking-tight leading-tight">
            {schoolName}
          </h2>
          <p className="text-xs sm:text-sm font-mono font-bold text-gray-800">
            Khám phá không gian học thuật, cơ sở vật chất và trải nghiệm đời sống sinh viên thực tế.
          </p>
        </div>

        {/* Right Side: The Campus SVG Artwork */}
        <div className="w-full md:w-[420px] lg:w-[480px] shrink-0">
          <svg
            viewBox="0 0 460 210"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto drop-shadow-[3px_3px_0px_#000]"
          >
            {/* Ground line */}
            <line x1="10" y1="190" x2="450" y2="190" stroke="#111111" strokeWidth="3" />
            <line x1="20" y1="196" x2="440" y2="196" stroke="#111111" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Sun with comic rays */}
            <g transform="translate(380, 45)">
              <rect x="-18" y="-18" width="36" height="36" fill="#facc15" stroke="#111111" strokeWidth="2.5" />
              <rect x="-12" y="-12" width="24" height="24" fill="#ffffff" opacity="0.4" />
              {/* Rays */}
              <line x1="0" y1="-28" x2="0" y2="-21" stroke="#111111" strokeWidth="2.5" strokeLinecap="square" />
              <line x1="0" y1="21" x2="0" y2="28" stroke="#111111" strokeWidth="2.5" strokeLinecap="square" />
              <line x1="-28" y1="0" x2="-21" y2="0" stroke="#111111" strokeWidth="2.5" strokeLinecap="square" />
              <line x1="21" y1="0" x2="28" y2="0" stroke="#111111" strokeWidth="2.5" strokeLinecap="square" />
            </g>

            {/* Clouds */}
            <g transform="translate(60, 30)">
              <rect x="0" y="8" width="50" height="16" fill="#ffffff" stroke="#111111" strokeWidth="2" />
              <rect x="12" y="0" width="28" height="14" fill="#ffffff" stroke="#111111" strokeWidth="2" />
            </g>
            <g transform="translate(240, 20)">
              <rect x="0" y="6" width="45" height="14" fill="#ffffff" stroke="#111111" strokeWidth="2" />
              <rect x="10" y="0" width="24" height="10" fill="#ffffff" stroke="#111111" strokeWidth="2" />
            </g>

            {/* Main Hall Building (Classical Academic Hall) */}
            <g id="main-hall" transform="translate(130, 45)">
              {/* Building Shadow block */}
              <rect x="12" y="42" width="180" height="103" fill="#111111" />

              {/* Central Hall Body */}
              <rect x="8" y="38" width="180" height="107" fill="#ffffff" stroke="#111111" strokeWidth="2.5" />

              {/* Roof Gable / Pediment */}
              <polygon points="8,38 98,0 188,38" fill="#f87171" stroke="#111111" strokeWidth="2.5" />
              <polygon points="26,38 98,6 170,38" fill="#fee2e2" stroke="#111111" strokeWidth="1.5" />

              {/* Clock Tower Center */}
              <rect x="80" y="-35" width="36" height="36" fill="#ffffff" stroke="#111111" strokeWidth="2.5" />
              <polygon points="80,-35 98,-52 116,-35" fill="#0284c7" stroke="#111111" strokeWidth="2" />
              {/* Pennant flagpole */}
              <line x1="98" y1="-52" x2="98" y2="-68" stroke="#111111" strokeWidth="2.5" />
              <polygon points="98,-68 122,-61 98,-54" fill="#e03a3e" stroke="#111111" strokeWidth="2" />
              <polygon points="102,-63 108,-61 102,-59" fill="#facc15" />

              {/* Clock on Tower */}
              <rect x="88" y="-27" width="20" height="20" fill="#fef9c3" stroke="#111111" strokeWidth="1.5" />
              <line x1="98" y1="-17" x2="98" y2="-23" stroke="#111111" strokeWidth="2" />
              <line x1="98" y1="-17" x2="104" y2="-17" stroke="#111111" strokeWidth="2" />

              {/* Pediment Academic Inscription */}
              <rect x="74" y="16" width="48" height="14" fill="#facc15" stroke="#111111" strokeWidth="1.5" />
              <text x="98" y="27" fill="#111111" fontSize="9" fontWeight="900" fontFamily="monospace" textAnchor="middle">
                {shortName.slice(0, 6)}
              </text>

              {/* Columns */}
              <rect x="22" y="44" width="14" height="75" fill="#e0f2fe" stroke="#111111" strokeWidth="2" />
              <rect x="62" y="44" width="14" height="75" fill="#e0f2fe" stroke="#111111" strokeWidth="2" />
              <rect x="120" y="44" width="14" height="75" fill="#e0f2fe" stroke="#111111" strokeWidth="2" />
              <rect x="160" y="44" width="14" height="75" fill="#e0f2fe" stroke="#111111" strokeWidth="2" />

              {/* Windows */}
              <rect x="42" y="52" width="14" height="20" fill="#38bdf8" stroke="#111111" strokeWidth="1.5" />
              <line x1="49" y1="52" x2="49" y2="72" stroke="#ffffff" strokeWidth="1.5" />
              <rect x="140" y="52" width="14" height="20" fill="#38bdf8" stroke="#111111" strokeWidth="1.5" />
              <line x1="147" y1="52" x2="147" y2="72" stroke="#ffffff" strokeWidth="1.5" />

              {/* Arched Double Door */}
              <rect x="85" y="70" width="26" height="50" fill="#1e293b" stroke="#111111" strokeWidth="2" />
              <line x1="98" y1="70" x2="98" y2="120" stroke="#facc15" strokeWidth="1.5" />
              <rect x="91" y="92" width="3" height="3" fill="#facc15" />
              <rect x="102" y="92" width="3" height="3" fill="#facc15" />

              {/* Entrance Steps */}
              <rect x="10" y="120" width="176" height="8" fill="#cbd5e1" stroke="#111111" strokeWidth="1.5" />
              <rect x="4" y="128" width="188" height="9" fill="#94a3b8" stroke="#111111" strokeWidth="1.5" />
              <rect x="-2" y="137" width="200" height="8" fill="#64748b" stroke="#111111" strokeWidth="2" />
            </g>

            {/* Left Pine Trees */}
            <g transform="translate(25, 80)">
              <polygon points="35,110 55,55 75,110" fill="#22c55e" stroke="#111111" strokeWidth="2.5" />
              <polygon points="40,90 55,40 70,90" fill="#4ade80" stroke="#111111" strokeWidth="2" />
              <rect x="51" y="110" width="8" height="15" fill="#78350f" stroke="#111111" strokeWidth="2" />

              <polygon points="10,110 25,65 40,110" fill="#16a34a" stroke="#111111" strokeWidth="2" />
              <rect x="22" y="110" width="6" height="15" fill="#78350f" stroke="#111111" strokeWidth="1.5" />
            </g>

            {/* Right Trees & Lamppost */}
            <g transform="translate(340, 85)">
              <polygon points="40,105 60,50 80,105" fill="#22c55e" stroke="#111111" strokeWidth="2.5" />
              <polygon points="45,85 60,35 75,85" fill="#86efac" stroke="#111111" strokeWidth="2" />
              <rect x="56" y="105" width="8" height="15" fill="#78350f" stroke="#111111" strokeWidth="2" />

              {/* Street lamp */}
              <rect x="15" y="40" width="5" height="65" fill="#111111" />
              <polygon points="8,40 27,40 22,25 13,25" fill="#fef9c3" stroke="#111111" strokeWidth="2" />
              <line x1="8" y1="40" x2="27" y2="40" stroke="#111111" strokeWidth="2" />
              {/* Lamp light glow */}
              <polygon points="13,40 22,40 32,70 3,70" fill="#fef08a" opacity="0.3" />
            </g>

            {/* Bicycle parked near right tree */}
            <g transform="translate(325, 155)">
              {/* Wheels */}
              <rect x="0" y="14" width="18" height="18" fill="none" stroke="#111111" strokeWidth="2" />
              <rect x="32" y="14" width="18" height="18" fill="none" stroke="#111111" strokeWidth="2" />
              {/* Frame */}
              <line x1="9" y1="23" x2="25" y2="23" stroke="#e03a3e" strokeWidth="2.5" />
              <line x1="9" y1="23" x2="19" y2="10" stroke="#e03a3e" strokeWidth="2.5" />
              <line x1="25" y1="23" x2="19" y2="10" stroke="#e03a3e" strokeWidth="2.5" />
              <line x1="25" y1="23" x2="41" y2="23" stroke="#e03a3e" strokeWidth="2" />
              <line x1="41" y1="23" x2="35" y2="7" stroke="#e03a3e" strokeWidth="2.5" />
              {/* Handlebar & Seat */}
              <line x1="32" y1="7" x2="38" y2="7" stroke="#111111" strokeWidth="2" />
              <line x1="16" y1="10" x2="22" y2="10" stroke="#111111" strokeWidth="2.5" />
            </g>

            {/* Student 1 (Walking with Yellow Backpack & Blue Jeans) */}
            <g transform="translate(85, 128)">
              {/* Head */}
              <rect x="12" y="0" width="11" height="12" fill="#fed7aa" stroke="#111111" strokeWidth="2" />
              {/* Hair */}
              <polygon points="10,0 25,0 23,6 11,5" fill="#451a03" stroke="#111111" strokeWidth="1.5" />
              {/* Red Sweater */}
              <rect x="9" y="12" width="17" height="22" fill="#ef4444" stroke="#111111" strokeWidth="2" />
              {/* Yellow Backpack */}
              <rect x="4" y="14" width="7" height="16" fill="#facc15" stroke="#111111" strokeWidth="2" />
              {/* Blue Jeans */}
              <rect x="9" y="34" width="8" height="25" fill="#0284c7" stroke="#111111" strokeWidth="2" />
              <rect x="18" y="34" width="8" height="25" fill="#0369a1" stroke="#111111" strokeWidth="2" />
              {/* Shoes */}
              <rect x="6" y="58" width="11" height="4" fill="#111111" />
              <rect x="18" y="58" width="11" height="4" fill="#111111" />
            </g>

            {/* Student 2 (Sitting with Book / Laptop) */}
            <g transform="translate(230, 142)">
              {/* Head */}
              <rect x="10" y="0" width="10" height="11" fill="#fed7aa" stroke="#111111" strokeWidth="2" />
              <rect x="8" y="0" width="14" height="4" fill="#312e81" stroke="#111111" strokeWidth="1.5" />
              {/* Green Top */}
              <rect x="8" y="11" width="14" height="17" fill="#10b981" stroke="#111111" strokeWidth="2" />
              {/* Legs seated */}
              <rect x="8" y="28" width="18" height="16" fill="#475569" stroke="#111111" strokeWidth="2" />
              {/* Book */}
              <polygon points="18,18 30,14 32,23 20,27" fill="#f59e0b" stroke="#111111" strokeWidth="1.5" />
            </g>

            {/* Pop-art Sparkle Stars */}
            <g transform="translate(110, 20)">
              <polygon points="8,0 10,6 16,8 10,10 8,16 6,10 0,8 6,6" fill="#facc15" stroke="#111111" strokeWidth="1.5" />
            </g>
            <g transform="translate(320, 28)">
              <polygon points="6,0 8,4 12,6 8,8 6,12 4,8 0,6 4,4" fill="#f43f5e" stroke="#111111" strokeWidth="1.5" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
