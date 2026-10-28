"use client";

import React from "react";

export type DoodleSpotVariant =
  | "grad_cap"
  | "book_stack"
  | "exam_grade"
  | "coffee_mug"
  | "backpack"
  | "thumbs_rating"
  | "stationery"
  | "chalkboard";

export const ALL_DOODLE_VARIANTS: DoodleSpotVariant[] = [
  "grad_cap",
  "book_stack",
  "exam_grade",
  "coffee_mug",
  "backpack",
  "thumbs_rating",
  "stationery",
  "chalkboard",
];

interface DoodleSpotGraphicProps {
  variant: DoodleSpotVariant;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  onClick?: () => void;
  title?: string;
}

/**
 * DoodleSpotGraphic:
 * Minimalist, elegant geometric academic line art in Blue & White.
 * Zero color gradients — crisp 1.5px blue strokes, subtle ice-blue and white fills.
 */
export const DoodleSpotGraphic: React.FC<DoodleSpotGraphicProps> = ({
  variant,
  className = "",
  size = "md",
  onClick,
  title,
}) => {
  const sizeClasses = {
    sm: "w-20 h-20 sm:w-24 sm:h-24",
    md: "w-28 h-28 sm:w-36 sm:h-36",
    lg: "w-36 h-36 sm:w-44 sm:h-44 lg:w-48 lg:h-48",
    xl: "w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64",
  }[size];

  const wrapSvg = (content: React.ReactNode) => (
    <div
      onClick={onClick}
      title={title || "Nhấn để đổi hình ngẫu nhiên / Click to shuffle doodles"}
      className={`relative inline-block select-none shrink-0 cursor-pointer transform hover:scale-105 active:scale-95 transition-transform duration-200 ${sizeClasses} ${className}`}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        {content}
      </svg>
    </div>
  );

  // 1. GRADUATION CAP & DIPLOMA SCROLL
  if (variant === "grad_cap") {
    return wrapSvg(
      <g>
        {/* Subtle geometric circle accent */}
        <circle cx="100" cy="100" r="70" stroke="#bfdbfe" strokeWidth="1" strokeDasharray="4 4" fill="#eff6ff" />
        
        {/* Cap Skull Base */}
        <path d="M72 105 C72 125, 128 125, 128 105 Z" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2" />

        {/* Diamond Top */}
        <polygon points="100,55 165,80 100,105 35,80" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="100" cy="80" r="4" fill="#1d4ed8" />
        <path d="M100 80 Q130 82 142 95 Q145 110 145 125" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="145" cy="126" r="3" fill="#1d4ed8" />

        {/* Diploma Scroll */}
        <rect x="55" y="135" width="90" height="22" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
        <rect x="95" y="133" width="10" height="26" fill="#1d4ed8" />
      </g>
    );
  }

  // 2. TEXTBOOK STACK & STUDY GLASSES
  if (variant === "book_stack") {
    return wrapSvg(
      <g>
        <circle cx="100" cy="100" r="70" stroke="#bfdbfe" strokeWidth="1" strokeDasharray="4 4" fill="#eff6ff" />
        
        {/* Books Stack */}
        <rect x="45" y="135" width="110" height="24" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
        <rect x="52" y="108" width="96" height="24" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
        <rect x="60" y="82" width="80" height="24" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />

        {/* Minimalist Glasses on top */}
        <circle cx="85" cy="65" r="12" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
        <circle cx="115" cy="65" r="12" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
        <line x1="97" y1="65" x2="103" y2="65" stroke="#1d4ed8" strokeWidth="1.5" />
      </g>
    );
  }

  // 3. EXAM GRADE A+ WITH BLUE ACCENT
  if (variant === "exam_grade") {
    return wrapSvg(
      <g>
        <circle cx="100" cy="100" r="70" stroke="#bfdbfe" strokeWidth="1" strokeDasharray="4 4" fill="#eff6ff" />
        
        {/* Exam Paper Sheet */}
        <rect x="55" y="45" width="90" height="110" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
        <line x1="70" y1="70" x2="115" y2="70" stroke="#93c5fd" strokeWidth="1.5" />
        <line x1="70" y1="88" x2="130" y2="88" stroke="#93c5fd" strokeWidth="1.5" />
        <line x1="70" y1="106" x2="130" y2="106" stroke="#93c5fd" strokeWidth="1.5" />
        <line x1="70" y1="124" x2="120" y2="124" stroke="#93c5fd" strokeWidth="1.5" />

        {/* Grade A+ Circle Stamp in Blue */}
        <circle cx="120" cy="65" r="18" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="2" />
        <text x="114" y="71" fontSize="16" fontWeight="bold" fill="#1d4ed8" textAnchor="middle" fontFamily="monospace">A</text>
        <text x="127" y="69" fontSize="13" fontWeight="bold" fill="#1d4ed8" textAnchor="middle" fontFamily="monospace">+</text>
      </g>
    );
  }

  // 4. COFFEE MUG
  if (variant === "coffee_mug") {
    return wrapSvg(
      <g>
        <circle cx="100" cy="100" r="70" stroke="#bfdbfe" strokeWidth="1" strokeDasharray="4 4" fill="#eff6ff" />
        
        {/* Steam */}
        <path d="M85 55 Q80 45 85 35" stroke="#93c5fd" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M100 55 Q95 45 100 35" stroke="#93c5fd" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M115 55 Q110 45 115 35" stroke="#93c5fd" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Mug Body */}
        <rect x="70" y="65" width="60" height="70" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2" />
        {/* Mug Handle */}
        <path d="M130 80 H145 C152 80, 152 110, 145 110 H130" fill="none" stroke="#1d4ed8" strokeWidth="2" />
        {/* Saucer */}
        <line x1="60" y1="140" x2="140" y2="140" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  }

  // 5. BACKPACK
  if (variant === "backpack") {
    return wrapSvg(
      <g>
        <circle cx="100" cy="100" r="70" stroke="#bfdbfe" strokeWidth="1" strokeDasharray="4 4" fill="#eff6ff" />
        
        {/* Handle */}
        <path d="M85 65 C85 45, 115 45, 115 65" fill="none" stroke="#1d4ed8" strokeWidth="2" />
        {/* Main Bag Body */}
        <rect x="65" y="65" width="70" height="85" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2" />
        {/* Front Pocket */}
        <rect x="75" y="105" width="50" height="35" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
        <line x1="75" y1="115" x2="125" y2="115" stroke="#1d4ed8" strokeWidth="1.5" />
      </g>
    );
  }

  // 6. THUMBS RATING
  if (variant === "thumbs_rating") {
    return wrapSvg(
      <g>
        <circle cx="100" cy="100" r="70" stroke="#bfdbfe" strokeWidth="1" strokeDasharray="4 4" fill="#eff6ff" />
        
        {/* Thumbs Up Icon Clean Blue Vector */}
        <g transform="translate(68, 62) scale(2.6)">
          <path
            d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
            fill="#ffffff"
            stroke="#1d4ed8"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    );
  }

  // 7. STATIONERY / PENCIL & RULER
  if (variant === "stationery") {
    return wrapSvg(
      <g>
        <circle cx="100" cy="100" r="70" stroke="#bfdbfe" strokeWidth="1" strokeDasharray="4 4" fill="#eff6ff" />
        
        {/* Ruler */}
        <g transform="rotate(-30 100 100)">
          <rect x="50" y="90" width="100" height="24" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
          <line x1="65" y1="90" x2="65" y2="100" stroke="#1d4ed8" strokeWidth="1.5" />
          <line x1="80" y1="90" x2="80" y2="96" stroke="#1d4ed8" strokeWidth="1.5" />
          <line x1="95" y1="90" x2="95" y2="100" stroke="#1d4ed8" strokeWidth="1.5" />
          <line x1="110" y1="90" x2="110" y2="96" stroke="#1d4ed8" strokeWidth="1.5" />
          <line x1="125" y1="90" x2="125" y2="100" stroke="#1d4ed8" strokeWidth="1.5" />
          <line x1="140" y1="90" x2="140" y2="96" stroke="#1d4ed8" strokeWidth="1.5" />
        </g>
        
        {/* Pencil */}
        <g transform="rotate(45 100 100)">
          <rect x="55" y="94" width="80" height="12" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
          <polygon points="135,94 150,100 135,106" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
        </g>
      </g>
    );
  }

  // 8. CHALKBOARD
  if (variant === "chalkboard") {
    return wrapSvg(
      <g>
        <circle cx="100" cy="100" r="70" stroke="#bfdbfe" strokeWidth="1" strokeDasharray="4 4" fill="#eff6ff" />
        
        {/* Board Frame */}
        <rect x="45" y="55" width="110" height="80" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2" />
        {/* Inner Board */}
        <rect x="53" y="63" width="94" height="64" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
        
        {/* Math equation */}
        <text x="100" y="100" fontSize="14" fontWeight="bold" fill="#1d4ed8" textAnchor="middle" fontFamily="monospace">
          E = mc²
        </text>

        {/* Chalk tray */}
        <rect x="40" y="135" width="120" height="6" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" />
      </g>
    );
  }

  return null;
};
