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
 * Authentic academic & university Neo-Brutalist spot illustrations.
 * Zero color gradients — purely bold solid colors, crisp black outlines, and playful details.
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

  // Common wrapper with click handling and smooth hover scaling
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
        {/* Organic Solid Background Blob (Sunny Yellow) */}
        <path
          d="M45 80 C28 40, 68 20, 115 25 C160 30, 182 68, 168 118 C152 165, 108 180, 66 162 C34 146, 62 116, 45 80 Z"
          fill="#fef08a"
        />

        {/* Decorative Sparkles */}
        <polygon
          points="28,48 33,38 38,48 48,53 38,58 33,68 28,58 18,53"
          fill="#facc15"
          stroke="#111111"
          strokeWidth="2"
        />
        <line x1="162" y1="38" x2="176" y2="28" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="172" y1="46" x2="184" y2="46" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />

        {/* Mortarboard Skull Base */}
        <path
          d="M72 96 C72 122, 128 122, 128 96 Z"
          fill="#1e3a8a"
          stroke="#111111"
          strokeWidth="3.2"
        />

        {/* Flat Diamond Top */}
        <polygon
          points="100,50 166,74 100,98 34,74"
          fill="#111111"
          stroke="#111111"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <polygon
          points="100,54 160,74 100,94 40,74"
          fill="#1d4ed8"
          stroke="#111111"
          strokeWidth="2"
        />

        {/* Center Button */}
        <circle cx="100" cy="74" r="5" fill="#facc15" stroke="#111111" strokeWidth="2" />

        {/* Golden Tassel */}
        <path
          d="M100 74 Q132 74 144 88 Q148 104 148 124"
          stroke="#facc15"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M142 124 L154 124 L151 144 L145 144 Z"
          fill="#facc15"
          stroke="#111111"
          strokeWidth="2.2"
        />
        <circle cx="148" cy="124" r="3.2" fill="#fb923c" stroke="#111111" strokeWidth="1.6" />

        {/* Rolled Diploma Parchment Scroll */}
        <g transform="translate(42, 132) rotate(-14)">
          <rect
            x="0"
            y="0"
            width="82"
            height="26"
            rx="4"
            fill="#ffffff"
            stroke="#111111"
            strokeWidth="3"
          />
          {/* Scroll Curl End */}
          <ellipse
            cx="0"
            cy="13"
            rx="5"
            ry="13"
            fill="#fef08a"
            stroke="#111111"
            strokeWidth="2.5"
          />
          {/* Red Ribbon Tie & Bow */}
          <rect x="36" y="-1" width="12" height="28" fill="#ef4444" stroke="#111111" strokeWidth="2" />
          <circle cx="42" cy="13" r="5" fill="#ef4444" stroke="#111111" strokeWidth="2" />
          <path d="M42 16 L35 30 L42 26 L49 30 Z" fill="#ef4444" stroke="#111111" strokeWidth="1.8" />
        </g>
      </g>
    );
  }

  // 2. TEXTBOOK STACK & STUDY GLASSES
  if (variant === "book_stack") {
    return wrapSvg(
      <g>
        {/* Organic Solid Background Blob (Soft Pink) */}
        <path
          d="M48 76 C28 36, 74 14, 126 24 C172 34, 186 74, 172 124 C156 168, 112 184, 66 164 C32 148, 66 112, 48 76 Z"
          fill="#fbcfe8"
        />

        {/* Motion / Doodles */}
        <path d="M34 46 Q44 36 54 46 T74 46" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="168" cy="46" r="3" fill="#111111" />
        <circle cx="178" cy="58" r="2" fill="#111111" />

        {/* Bottom Book (Mint Green) */}
        <rect x="34" y="132" width="132" height="28" rx="4" fill="#4ade80" stroke="#111111" strokeWidth="3.2" />
        <rect x="146" y="136" width="16" height="20" fill="#ffffff" stroke="#111111" strokeWidth="2" />
        <line x1="44" y1="136" x2="44" y2="156" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />

        {/* Middle Book (Sky Blue) */}
        <rect x="40" y="104" width="122" height="28" rx="4" fill="#38bdf8" stroke="#111111" strokeWidth="3.2" />
        <rect x="142" y="108" width="16" height="20" fill="#ffffff" stroke="#111111" strokeWidth="2" />
        <line x1="50" y1="108" x2="50" y2="128" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />

        {/* Top Book (Vibrant Yellow) */}
        <rect x="46" y="76" width="112" height="28" rx="4" fill="#facc15" stroke="#111111" strokeWidth="3.2" />
        <rect x="138" y="80" width="16" height="20" fill="#ffffff" stroke="#111111" strokeWidth="2" />
        <line x1="56" y1="80" x2="56" y2="100" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />

        {/* Bookmark Ribbon poking out */}
        <path d="M80 76 L80 114 L90 106 L100 114 L100 76 Z" fill="#ef4444" stroke="#111111" strokeWidth="2.5" />

        {/* Academic Reading Glasses resting on top */}
        <g transform="translate(14, 0)">
          <circle cx="70" cy="58" r="14" fill="#ffffff" stroke="#111111" strokeWidth="3.2" />
          <circle cx="106" cy="58" r="14" fill="#ffffff" stroke="#111111" strokeWidth="3.2" />
          <path d="M84 58 Q88 52 92 58" stroke="#111111" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <line x1="56" y1="58" x2="44" y2="52" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="120" y1="58" x2="132" y2="52" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
          {/* Glass Glare */}
          <line x1="64" y1="52" x2="72" y2="62" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="100" y1="52" x2="108" y2="62" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </g>
    );
  }

  // 3. EXAM PAPER WITH A+ GRADE STAMP & CHECKMARKS
  if (variant === "exam_grade") {
    return wrapSvg(
      <g>
        {/* Organic Solid Background Blob (Soft Mint) */}
        <path
          d="M52 72 C32 32, 78 16, 124 24 C166 34, 184 74, 174 124 C160 168, 114 184, 68 164 C28 144, 64 110, 52 72 Z"
          fill="#bbf7d0"
        />

        {/* Sparkles */}
        <polygon
          points="160,34 163,42 171,42 165,47 167,55 160,50 153,55 155,47 149,42 157,42"
          fill="#facc15"
          stroke="#111111"
          strokeWidth="1.8"
        />

        {/* Paper Sheet (Tilted) */}
        <g transform="rotate(-6 100 100)">
          <polygon
            points="46,36 128,36 154,62 154,166 46,166"
            fill="#ffffff"
            stroke="#111111"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          {/* Dog-eared Fold */}
          <polygon
            points="128,36 128,62 154,62"
            fill="#fef08a"
            stroke="#111111"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Exam Rule Lines */}
          <line x1="58" y1="64" x2="114" y2="64" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="58" y1="84" x2="136" y2="84" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="58" y1="104" x2="136" y2="104" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="58" y1="124" x2="112" y2="124" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="58" y1="144" x2="122" y2="144" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />

          {/* Green Checkmarks */}
          <path d="M52 82 L57 88 L68 76" stroke="#16a34a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M52 102 L57 108 L68 96" stroke="#16a34a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M52 122 L57 128 L68 116" stroke="#16a34a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Big Bold Red A+ Stamp */}
          <circle cx="118" cy="116" r="26" fill="#fee2e2" stroke="#ef4444" strokeWidth="3.2" strokeDasharray="5 3" />
          <text
            x="105"
            y="126"
            fontSize="26"
            fontWeight="900"
            fill="#ef4444"
            fontFamily="sans-serif"
          >
            A+
          </text>
        </g>

        {/* Red Grading Pen alongside */}
        <g transform="translate(138, 54) rotate(22)">
          <rect x="0" y="0" width="10" height="74" rx="3" fill="#ef4444" stroke="#111111" strokeWidth="2.5" />
          <polygon points="0,74 10,74 5,88" fill="#facc15" stroke="#111111" strokeWidth="2" />
          <polygon points="3,84 7,84 5,88" fill="#111111" />
          <rect x="-2" y="10" width="4" height="24" rx="1" fill="#facc15" stroke="#111111" strokeWidth="1.5" />
        </g>
      </g>
    );
  }

  // 4. STUDY COFFEE MUG & ALARM CLOCK
  if (variant === "coffee_mug") {
    return wrapSvg(
      <g>
        {/* Organic Solid Background Blob (Soft Peach) */}
        <path
          d="M46 78 C26 38, 72 18, 116 24 C166 28, 184 68, 172 118 C156 164, 112 180, 66 164 C34 148, 62 114, 46 78 Z"
          fill="#fed7aa"
        />

        {/* Steam Squiggles */}
        <path d="M80 58 Q70 42 80 28 T74 14" stroke="#111111" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M96 52 Q106 38 96 24 T100 10" stroke="#111111" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M112 56 Q122 42 112 28 T118 14" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Mug Body */}
        <g>
          {/* Handle */}
          <path d="M128 88 C154 88, 154 130, 124 132" fill="none" stroke="#111111" strokeWidth="8" strokeLinecap="round" />
          <path d="M128 88 C154 88, 154 130, 124 132" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />

          {/* Cup Basin */}
          <path
            d="M56 74 L62 144 C64 158, 126 158, 128 144 L134 74 Z"
            fill="#38bdf8"
            stroke="#111111"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Rim */}
          <ellipse cx="95" cy="74" rx="39" ry="10" fill="#0284c7" stroke="#111111" strokeWidth="3.2" />
          {/* Coffee Surface */}
          <ellipse cx="95" cy="76" rx="34" ry="7" fill="#78350f" />

          {/* Golden Star Badge on Mug */}
          <polygon
            points="95,96 99,106 110,106 101,113 104,124 95,117 86,124 89,113 80,106 91,106"
            fill="#facc15"
            stroke="#111111"
            strokeWidth="2"
          />
        </g>

        {/* Twin-Bell Alarm Clock on the right */}
        <g transform="translate(142, 134)">
          {/* Clock Bells */}
          <ellipse cx="-10" cy="-14" rx="5" ry="3" fill="#1e3a8a" stroke="#111111" strokeWidth="1.8" transform="rotate(-30 -10 -14)" />
          <ellipse cx="10" cy="-14" rx="5" ry="3" fill="#1e3a8a" stroke="#111111" strokeWidth="1.8" transform="rotate(30 10 -14)" />
          {/* Clock Body */}
          <circle cx="0" cy="0" r="18" fill="#facc15" stroke="#111111" strokeWidth="2.5" />
          <circle cx="0" cy="0" r="13" fill="#ffffff" stroke="#111111" strokeWidth="1.8" />
          {/* Clock Hands */}
          <line x1="0" y1="0" x2="0" y2="-9" stroke="#111111" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="0" y1="0" x2="7" y2="0" stroke="#111111" strokeWidth="2.2" strokeLinecap="round" />
          {/* Clock Feet */}
          <line x1="-10" y1="14" x2="-14" y2="20" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="10" y1="14" x2="14" y2="20" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </g>
    );
  }

  // 5. COLLEGE BACKPACK & SET-SQUARE RULER
  if (variant === "backpack") {
    return wrapSvg(
      <g>
        {/* Organic Solid Background Blob (Soft Lilac) */}
        <path
          d="M48 76 C28 36, 74 14, 122 24 C166 34, 186 74, 172 124 C156 168, 112 184, 66 164 C30 148, 66 112, 48 76 Z"
          fill="#e9d5ff"
        />

        {/* Set-Square Ruler (ê-ke) sticking out */}
        <g transform="translate(10, 0)">
          <polygon points="38,82 82,24 94,72" fill="#facc15" stroke="#111111" strokeWidth="3" strokeLinejoin="round" />
          <polygon points="52,72 72,46 78,68" fill="#e9d5ff" stroke="#111111" strokeWidth="2" />
          <line x1="48" y1="66" x2="54" y2="62" stroke="#111111" strokeWidth="2" />
          <line x1="58" y1="52" x2="64" y2="48" stroke="#111111" strokeWidth="2" />
          <line x1="68" y1="38" x2="74" y2="34" stroke="#111111" strokeWidth="2" />
        </g>

        {/* Fountain Pen sticking out on right */}
        <g transform="translate(136, 30) rotate(16)">
          <rect x="0" y="14" width="10" height="42" rx="3" fill="#38bdf8" stroke="#111111" strokeWidth="2.5" />
          <polygon points="0,14 10,14 5,0" fill="#111111" stroke="#111111" strokeWidth="1.5" />
        </g>

        {/* Backpack Body */}
        {/* Top Handle */}
        <path d="M84 66 C84 48, 116 48, 116 66" fill="none" stroke="#111111" strokeWidth="4" strokeLinecap="round" />
        {/* Main Bag Compartment */}
        <path
          d="M54 78 C54 64, 146 64, 146 78 L152 160 C152 168, 48 168, 48 160 Z"
          fill="#fb923c"
          stroke="#111111"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Front Zipper Pocket */}
        <rect x="64" y="114" width="72" height="44" rx="6" fill="#1e3a8a" stroke="#111111" strokeWidth="3.2" />
        {/* Zipper Line */}
        <line x1="72" y1="124" x2="128" y2="124" stroke="#facc15" strokeWidth="2.5" strokeDasharray="3 2" />
        <circle cx="100" cy="124" r="3.5" fill="#ffffff" stroke="#111111" strokeWidth="1.5" />

        {/* Enamel Pin Badge on Bag */}
        <circle cx="78" cy="94" r="9" fill="#f472b6" stroke="#111111" strokeWidth="2" />
        <text x="74" y="98" fontSize="10" fontWeight="bold" fill="#ffffff" fontFamily="sans-serif">★</text>
      </g>
    );
  }

  // 6. THUMBS UP RATING & GOLDEN STARS
  if (variant === "thumbs_rating") {
    return wrapSvg(
      <g>
        {/* Organic Solid Background Blob (Soft Sky Blue) */}
        <path
          d="M46 78 C26 38, 72 18, 116 24 C166 28, 184 68, 172 118 C156 164, 112 180, 66 164 C34 148, 62 114, 46 78 Z"
          fill="#bae6fd"
        />

        {/* Three Golden Stars */}
        <polygon
          points="44,42 47,49 55,49 49,54 51,62 44,57 37,62 39,54 33,49 41,49"
          fill="#facc15"
          stroke="#111111"
          strokeWidth="2.2"
        />
        <polygon
          points="95,20 100,32 114,32 103,41 107,54 95,46 83,54 87,41 76,32 90,32"
          fill="#facc15"
          stroke="#111111"
          strokeWidth="3"
        />
        <polygon
          points="146,38 149,45 157,45 151,50 153,58 146,53 139,58 141,50 135,45 143,45"
          fill="#facc15"
          stroke="#111111"
          strokeWidth="2.2"
        />

        {/* Motion Radiations */}
        <line x1="86" y1="70" x2="86" y2="60" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="102" y1="70" x2="108" y2="62" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />

        {/* Big Thumbs Up Hand */}
        {/* Wrist Cuff */}
        <rect x="66" y="144" width="46" height="26" rx="4" fill="#f472b6" stroke="#111111" strokeWidth="3.5" />

        {/* Hand Shape */}
        <path
          d="M72 144 L72 104 C72 94, 82 80, 88 80 C95 80, 96 90, 96 102 L96 104 C102 102, 114 102, 116 110 C120 110, 126 112, 126 120 C128 122, 132 125, 132 132 C132 142, 118 144, 110 144 Z"
          fill="#fed7aa"
          stroke="#111111"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Finger Creases */}
        <path d="M96 114 C106 114, 114 114, 118 116" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M96 126 C106 126, 116 126, 122 128" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M96 136 C104 136, 114 136, 120 138" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    );
  }

  // 7. GIANT YELLOW PENCIL & ERASER
  if (variant === "stationery") {
    return wrapSvg(
      <g>
        {/* Organic Solid Background Blob (Sunny Yellow) */}
        <path
          d="M48 76 C28 36, 74 14, 126 24 C172 34, 186 74, 172 124 C156 168, 112 184, 66 164 C32 148, 66 112, 48 76 Z"
          fill="#fef08a"
        />

        {/* Big Angled Yellow Pencil */}
        <g transform="rotate(34 100 100)">
          {/* Pencil Shaft */}
          <rect x="80" y="36" width="40" height="108" fill="#facc15" stroke="#111111" strokeWidth="3.5" />
          <line x1="93" y1="36" x2="93" y2="144" stroke="#eab308" strokeWidth="2.5" />
          <line x1="107" y1="36" x2="107" y2="144" stroke="#ca8a04" strokeWidth="2.5" />

          {/* Sharpened Wood Point */}
          <polygon points="80,144 120,144 100,186" fill="#fed7aa" stroke="#111111" strokeWidth="3.2" />
          {/* Graphite Lead Tip */}
          <polygon points="94,174 106,174 100,186" fill="#111111" />

          {/* Silver Ferrule Band */}
          <rect x="80" y="24" width="40" height="12" fill="#cbd5e1" stroke="#111111" strokeWidth="3.2" />
          <line x1="80" y1="30" x2="120" y2="30" stroke="#64748b" strokeWidth="2" />

          {/* Pink Eraser Head */}
          <path d="M80 24 C80 10, 120 10, 120 24 Z" fill="#f472b6" stroke="#111111" strokeWidth="3.2" />
        </g>

        {/* Block Eraser on Side */}
        <g transform="translate(24, 126)">
          <polygon points="10,25 35,5 55,20 30,40" fill="#38bdf8" stroke="#111111" strokeWidth="2.5" />
          <polygon points="18,19 35,5 55,20 38,34" fill="#ffffff" stroke="#111111" strokeWidth="2" />
        </g>

        {/* Graphite Swirls */}
        <path d="M38 72 Q24 92 38 112 T74 116" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="164" cy="66" r="3" fill="#111111" />
        <circle cx="174" cy="80" r="2" fill="#111111" />
      </g>
    );
  }

  // 8. CHALKBOARD & LIGHTBULB IDEA
  return wrapSvg(
    <g>
      {/* Organic Solid Background Blob (Soft Peach/Orange) */}
      <path
        d="M46 78 C26 38, 72 18, 116 24 C166 28, 184 68, 172 118 C156 164, 112 180, 66 164 C34 148, 62 114, 46 78 Z"
        fill="#fed7aa"
      />

      {/* Wooden Easel Legs */}
      <line x1="56" y1="130" x2="42" y2="176" stroke="#b45309" strokeWidth="5.5" strokeLinecap="round" />
      <line x1="144" y1="130" x2="158" y2="176" stroke="#b45309" strokeWidth="5.5" strokeLinecap="round" />
      <line x1="100" y1="44" x2="100" y2="28" stroke="#b45309" strokeWidth="5.5" strokeLinecap="round" />

      {/* Chalkboard Outer Wood Frame */}
      <rect x="44" y="44" width="112" height="92" rx="4" fill="#d97706" stroke="#111111" strokeWidth="3.5" />
      {/* Dark Chalkboard Inner Surface */}
      <rect x="52" y="52" width="96" height="76" rx="2" fill="#0f172a" stroke="#111111" strokeWidth="2" />

      {/* Chalk Drawings on Board */}
      <text
        x="60"
        y="76"
        fontSize="14"
        fontWeight="bold"
        fill="#f8fafc"
        fontFamily="monospace"
      >
        E=mc²
      </text>

      {/* Glowing Lightbulb */}
      <circle cx="120" cy="80" r="10" fill="#facc15" stroke="#ffffff" strokeWidth="1.5" />
      <rect x="117" y="90" width="6" height="4" fill="#cbd5e1" stroke="#ffffff" strokeWidth="1" />
      <line x1="120" y1="66" x2="120" y2="62" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="130" y1="72" x2="134" y2="68" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="110" y1="72" x2="106" y2="68" stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" />

      {/* Formula Underline / Waves */}
      <path d="M60 110 Q70 106 80 110 T100 110" stroke="#4ade80" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* Chalk Tray & Chalk */}
      <rect x="48" y="132" width="104" height="8" rx="2" fill="#b45309" stroke="#111111" strokeWidth="2" />
      <rect x="66" y="130" width="12" height="4" rx="1" fill="#ffffff" />
      <rect x="114" y="128" width="16" height="6" rx="1" fill="#475569" stroke="#111111" strokeWidth="1" />
    </g>
  );
};
