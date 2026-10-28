import React from "react";

export const CampusIllustrationBanner: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div
      aria-hidden="true"
      className={`w-full overflow-hidden pointer-events-none select-none flex justify-center items-end ${className}`}
    >
      <svg
        viewBox="0 0 1440 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-7xl h-auto opacity-95 transition-opacity duration-300"
        preserveAspectRatio="xMidYMax meet"
      >
        {/* Subtle ground line */}
        <line x1="40" y1="214" x2="1400" y2="214" stroke="#bfdbfe" strokeWidth="1.5" strokeDasharray="6 6" />

        {/* LEFT SCENE */}
        <g id="left-scene" transform="translate(60, 0)">
          <circle cx="120" cy="120" r="48" stroke="#bfdbfe" strokeWidth="1.5" strokeDasharray="3 3" fill="#eff6ff" />
          <path d="M120 168 V214" stroke="#93c5fd" strokeWidth="2" />
          <path d="M100 185 L120 175 L135 188" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />

          <circle cx="60" cy="140" r="36" stroke="#bfdbfe" strokeWidth="1.5" fill="#f8fafc" />
          <path d="M60 176 V214" stroke="#93c5fd" strokeWidth="2" />

          {/* Park Bench */}
          <path
            d="M170 195 H290 M180 180 H280 M190 180 V214 M270 180 V214 M180 160 H280 M180 160 V195 M280 160 V195"
            stroke="#93c5fd"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Student with Laptop */}
          <ellipse cx="218" cy="138" rx="8" ry="10" fill="#1e40af" />
          <circle cx="219" cy="142" r="7" fill="#dbeafe" />
          <path d="M208 152 C208 148, 228 148, 230 152 L234 180 H204 Z" fill="#3b82f6" />
          <path d="M214 162 L228 174 H246" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
          <path d="M206 180 H232 L234 206 H222 L220 188 L212 206 H202 Z" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
          <ellipse cx="206" cy="209" rx="5" ry="3" fill="#1d4ed8" />
          <ellipse cx="228" cy="209" rx="5" ry="3" fill="#1d4ed8" />
          <path d="M228 174 L244 174 L250 160 L234 160 Z" fill="#ffffff" stroke="#93c5fd" strokeWidth="1.5" />
          <line x1="226" y1="174" x2="252" y2="174" stroke="#1d4ed8" strokeWidth="2" />

          {/* Senior / Mentor */}
          <circle cx="263" cy="140" r="7" fill="#dbeafe" />
          <path d="M250 152 C250 148, 274 148, 276 152 L280 192 H248 Z" fill="#1d4ed8" />
          <path d="M260 165 L272 178 L278 174" stroke="#1d4ed8" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M278 174 V214" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="256" cy="209" rx="5" ry="3" fill="#1e40af" />
          <ellipse cx="270" cy="209" rx="5" ry="3" fill="#1e40af" />

          {/* Lamp Post */}
          <path d="M350 70 V214" stroke="#93c5fd" strokeWidth="3" />
          <path d="M342 90 H368 L360 100 H350 Z" stroke="#bfdbfe" strokeWidth="1.5" fill="#eff6ff" />
        </g>

        {/* CENTER SCENE: Campus Arch */}
        <g id="center-scene" transform="translate(620, 20)">
          <path
            d="M30 194 V70 H170 V194 M60 194 V100 C60 75, 140 75, 140 100 V194"
            stroke="#bfdbfe"
            strokeWidth="2.5"
            fill="#eff6ff"
          />
          <path d="M20 70 H180 V62 H20 Z" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5" />
          <polygon points="100 25, 40 62, 160 62" fill="#eff6ff" stroke="#93c5fd" strokeWidth="2" />
          <circle cx="100" cy="48" r="8" stroke="#1d4ed8" strokeWidth="1.5" fill="#ffffff" />
          <line x1="100" y1="48" x2="100" y2="43" stroke="#1d4ed8" strokeWidth="1.5" />
          <line x1="100" y1="48" x2="104" y2="48" stroke="#1d4ed8" strokeWidth="1.5" />
        </g>

        {/* RIGHT SCENE */}
        <g id="right-scene" transform="translate(1000, 0)">
          <circle cx="100" cy="130" r="42" stroke="#bfdbfe" strokeWidth="1.5" fill="#eff6ff" />
          <path d="M100 172 V214" stroke="#93c5fd" strokeWidth="2" />
          {/* Bicycle */}
          <circle cx="180" cy="188" r="22" stroke="#1d4ed8" strokeWidth="2" fill="none" />
          <circle cx="240" cy="188" r="22" stroke="#1d4ed8" strokeWidth="2" fill="none" />
          <path d="M180 188 L204 165 H224 L240 188 M204 165 L218 188 H190 M218 188 L220 155 M214 155 H226" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
};
