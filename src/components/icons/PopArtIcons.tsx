"use client";

import React from "react";

interface IconProps {
  className?: string;
}

/**
 * 1. PopArtPencil:
 * Classic pop-art pencil angled at -40deg:
 * Bright yellow body (#facc15), pink eraser (#f43f5e), silver ferrule (#cbd5e1),
 * wood tip (#fde68a), black graphite lead (#111111), with bold black comic outlines.
 * Directly inspired by the RateUrProfs "Manage and Edit Reviews" character illustration.
 */
export const PopArtPencil: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <g transform="rotate(-40 12 12)">
      {/* Pink Eraser */}
      <path d="M7 2.5 H17 V5.5 H7 Z" fill="#f43f5e" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
      {/* Silver Ferrule */}
      <path d="M7 5.5 H17 V7.5 H7 Z" fill="#cbd5e1" stroke="#111111" strokeWidth="1.5" />
      {/* Yellow Pencil Body */}
      <path d="M7 7.5 H17 V17 H7 Z" fill="#facc15" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
      {/* Facet stripes */}
      <line x1="10.5" y1="7.5" x2="10.5" y2="17" stroke="#ca8a04" strokeWidth="1.25" />
      <line x1="13.5" y1="7.5" x2="13.5" y2="17" stroke="#ca8a04" strokeWidth="1.25" />
      {/* Wood Cone Tip */}
      <polygon points="7,17 17,17 12,22.5" fill="#fde68a" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
      {/* Graphite Tip */}
      <polygon points="10,20 14,20 12,22.5" fill="#111111" />
    </g>
  </svg>
);

/**
 * 2. PopArtBookmark:
 * Neo-brutalist swallowtail bookmark ribbon with hard drop shadow,
 * solid fill, and comic highlight. Inspired by the empty-state badge reference.
 */
export const PopArtBookmark: React.FC<IconProps & { filled?: boolean; color?: string }> = ({
  className = "w-4 h-4",
  filled = false,
  color = "#fef08a",
}) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    {/* Hard drop shadow */}
    <path d="M6 3 H18 V21 L12 17 L6 21 Z" fill="#111111" transform="translate(1.5, 1.5)" />
    {/* Main Ribbon */}
    <path
      d="M6 3 H18 V21 L12 17 L6 21 Z"
      fill={filled ? color : "#ffffff"}
      stroke="#111111"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Inner highlight line */}
    <line x1="8.5" y1="5" x2="8.5" y2="15" stroke={filled ? "#111111" : "#e2e8f0"} strokeWidth="1.5" strokeLinecap="round" opacity={filled ? 0.25 : 1} />
  </svg>
);

/**
 * 3. PopArtThumbsUp:
 * Comic pop-art thumbs-up with blue sleeve cuff (#0284c7),
 * cheerful yellow / coral-red hand, crease lines, and bold black outline.
 * Directly inspired by the "Helpful Review" illustration reference.
 */
export const PopArtThumbsUp: React.FC<IconProps & { active?: boolean }> = ({
  className = "w-4 h-4",
  active = false,
}) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    {/* Drop shadow */}
    <g transform="translate(1.5, 1.5)" opacity="0.3">
      <rect x="2" y="10" width="5" height="11" rx="1" fill="#111111" />
      <path d="M7 11 V20 H18 C19.5 20 20.5 19 20.5 17.5 C20.5 17 21 15.5 20.5 14.5 C21 13.5 20.5 12.5 19.5 12 C19.5 12 18.5 12 17 12 C16.5 12 16 11 16 9.5 C16 7.5 15.5 4 13.5 3 C12.5 2.5 11 3.5 11 5 C11 7 10 9 7 11 Z" fill="#111111" />
    </g>
    {/* Blue Sleeve / Cuff */}
    <rect x="2" y="10" width="5" height="11" rx="1" fill="#0284c7" stroke="#111111" strokeWidth="2" />
    <line x1="4.5" y1="11" x2="4.5" y2="20" stroke="#bae6fd" strokeWidth="1.25" />
    {/* Hand & Thumb */}
    <path
      d="M7 11 V20 H18 C19.5 20 20.5 19 20.5 17.5 C20.5 17 21 15.5 20.5 14.5 C21 13.5 20.5 12.5 19.5 12 C19.5 12 18.5 12 17 12 C16.5 12 16 11 16 9.5 C16 7.5 15.5 4 13.5 3 C12.5 2.5 11 3.5 11 5 C11 7 10 9 7 11 Z"
      fill={active ? "#f87171" : "#fef08a"}
      stroke="#111111"
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    {/* Finger Creases */}
    <path d="M16 14.5 H19" stroke={active ? "#b91c1c" : "#ca8a04"} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M16 17 H18.5" stroke={active ? "#b91c1c" : "#ca8a04"} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * 4. PopArtStar:
 * Comic pop-art star with hard drop shadow, golden yellow fill (#facc15),
 * and white curved reflection highlight on top-left arm.
 */
export const PopArtStar: React.FC<IconProps & { filled?: boolean }> = ({
  className = "w-4 h-4",
  filled = true,
}) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    {/* Drop shadow */}
    <path
      d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 L12 2 Z"
      fill="#111111"
      transform="translate(1.5, 1.5)"
    />
    {/* Star Body */}
    <path
      d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 L12 2 Z"
      fill={filled ? "#facc15" : "#ffffff"}
      stroke="#111111"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* White Curved Shine Highlight */}
    <path d="M10.5 6.5 L8.5 7 L9 9.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 5. PopArtShieldAlert:
 * Comic security shield with soft red fill (#fee2e2), bold red exclamation (#e03a3e),
 * hard drop shadow, and crisp black outlines.
 */
export const PopArtShieldAlert: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    {/* Drop shadow */}
    <path d="M12 2 L20 5 V11 C20 16.5 16.5 21 12 22 C7.5 21 4 16.5 4 11 V5 L12 2 Z" fill="#111111" transform="translate(1.5, 1.5)" />
    {/* Shield Body */}
    <path
      d="M12 2 L20 5 V11 C20 16.5 16.5 21 12 22 C7.5 21 4 16.5 4 11 V5 L12 2 Z"
      fill="#fee2e2"
      stroke="#111111"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Red Warning Exclamation */}
    <line x1="12" y1="7" x2="12" y2="13" stroke="#e03a3e" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="16.5" r="1.25" fill="#e03a3e" />
  </svg>
);

/**
 * 6. PopArtGlobe:
 * Pop-art globe with cyan ocean (#38bdf8), mint continents (#bbf7d0),
 * black coordinate grid, white shine dot, and hard drop shadow.
 */
export const PopArtGlobe: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    {/* Drop shadow */}
    <circle cx="12" cy="12" r="9" fill="#111111" transform="translate(1.5, 1.5)" />
    {/* Globe Ocean */}
    <circle cx="12" cy="12" r="9" fill="#38bdf8" stroke="#111111" strokeWidth="2" />
    {/* Mint Continents */}
    <path d="M7 8 C8 7, 10 7, 11 9 C11 11, 9 12, 8 13 C7 14, 6 12, 7 8 Z" fill="#bbf7d0" stroke="#111111" strokeWidth="1" />
    <path d="M14 11 C15 10, 18 10, 19 12 C18 15, 16 16, 14 14 C13 13, 13 12, 14 11 Z" fill="#bbf7d0" stroke="#111111" strokeWidth="1" />
    <path d="M10 16 C12 15, 14 16, 15 18 C13 20, 10 19, 10 16 Z" fill="#bbf7d0" stroke="#111111" strokeWidth="1" />
    {/* Lat/Long Grid lines */}
    <ellipse cx="12" cy="12" rx="4" ry="9" stroke="#111111" strokeWidth="1.25" />
    <line x1="3" y1="12" x2="21" y2="12" stroke="#111111" strokeWidth="1.25" />
    {/* Shine highlight */}
    <circle cx="8" cy="6" r="1.5" fill="#ffffff" />
  </svg>
);

/**
 * 7. PopArtSearch:
 * Pop-art magnifying glass with sky-blue lens (#bae6fd), reflection arc,
 * yellow handle (#facc15), and hard drop shadow.
 */
export const PopArtSearch: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    {/* Drop shadow */}
    <g transform="translate(1.5, 1.5)">
      <circle cx="10" cy="10" r="7" fill="#111111" />
      <path d="M15 15 L21 21" stroke="#111111" strokeWidth="4" strokeLinecap="round" />
    </g>
    {/* Handle */}
    <path d="M15 15 L21 21" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M15 15 L21 21" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" />
    {/* Lens Body */}
    <circle cx="10" cy="10" r="7" fill="#bae6fd" stroke="#111111" strokeWidth="2" />
    {/* Reflection Arc */}
    <path d="M7 7 C8 6, 10 6, 11 6.5" stroke="#ffffff" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

/**
 * 8. PopArtMapPin:
 * Pop-art location pin with vibrant red marker (#ef4444), white inner dot,
 * ground shadow, and bold black comic outline.
 */
export const PopArtMapPin: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    {/* Ground Shadow */}
    <ellipse cx="12" cy="21.5" rx="4.5" ry="1.5" fill="#111111" opacity="0.6" />
    {/* Pin Shadow */}
    <path d="M12 2 C8 2, 5 5, 5 9 C5 14, 12 20, 12 20 C12 20, 19 14, 19 9 C19 5, 16 2, 12 2 Z" fill="#111111" transform="translate(1, 1)" />
    {/* Pin Body */}
    <path
      d="M12 2 C8 2, 5 5, 5 9 C5 14, 12 20, 12 20 C12 20, 19 14, 19 9 C19 5, 16 2, 12 2 Z"
      fill="#ef4444"
      stroke="#111111"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* White Center Dot */}
    <circle cx="12" cy="8.5" r="3" fill="#ffffff" stroke="#111111" strokeWidth="1.5" />
    {/* Shine Arc */}
    <path d="M8.5 6 C9.5 4.5, 11 4, 12.5 4" stroke="#ffffff" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
);

/**
 * 9. PopArtUser:
 * Character avatar with blue cap (#0284c7) and sunglasses,
 * inspired directly by the RateUrProfs character references.
 */
export const PopArtUser: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    {/* Head shadow */}
    <circle cx="12" cy="7.5" r="4.5" fill="#111111" transform="translate(1, 1)" />
    {/* Head */}
    <circle cx="12" cy="7.5" r="4.5" fill="#fed7aa" stroke="#111111" strokeWidth="2" />
    {/* Blue Cap */}
    <path d="M7.5 7 C8 4, 12 4, 16.5 6" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
    {/* Sunglasses */}
    <rect x="9.5" y="6.5" width="5" height="2" rx="0.5" fill="#111111" />
    {/* Shoulders */}
    <path
      d="M5 20 C5 16, 8 13.5, 12 13.5 C16 13.5, 19 16, 19 20"
      fill="#38bdf8"
      stroke="#111111"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 10. PopArtSliders:
 * Neo-brutalist equalizer sliders with yellow, sky blue, and pink sliding knobs.
 */
export const PopArtSliders: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <line x1="4" y1="6" x2="20" y2="6" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
    <circle cx="9" cy="6" r="3" fill="#facc15" stroke="#111111" strokeWidth="2" />
    <line x1="4" y1="12" x2="20" y2="12" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="12" r="3" fill="#38bdf8" stroke="#111111" strokeWidth="2" />
    <line x1="4" y1="18" x2="20" y2="18" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
    <circle cx="8" cy="18" r="3" fill="#f472b6" stroke="#111111" strokeWidth="2" />
  </svg>
);

/**
 * 11. PopArtBuilding:
 * Neo-brutalist campus university building with cyan body and yellow door.
 */
export const PopArtBuilding: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    {/* Drop shadow */}
    <rect x="4" y="3" width="16" height="18" rx="1" fill="#111111" transform="translate(1.5, 1.5)" />
    {/* Body */}
    <rect x="4" y="3" width="16" height="18" rx="1" fill="#bae6fd" stroke="#111111" strokeWidth="2" />
    {/* Windows */}
    <rect x="7" y="6" width="3" height="3" fill="#ffffff" stroke="#111111" strokeWidth="1.25" />
    <rect x="14" y="6" width="3" height="3" fill="#ffffff" stroke="#111111" strokeWidth="1.25" />
    <rect x="7" y="11" width="3" height="3" fill="#ffffff" stroke="#111111" strokeWidth="1.25" />
    <rect x="14" y="11" width="3" height="3" fill="#ffffff" stroke="#111111" strokeWidth="1.25" />
    {/* Door */}
    <rect x="10" y="16" width="4" height="5" fill="#facc15" stroke="#111111" strokeWidth="1.5" />
  </svg>
);

/**
 * 12. PopArtSettings:
 * Warm orange gear with white center hole and bold black teeth.
 */
export const PopArtSettings: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <circle cx="12" cy="12" r="8" fill="#111111" transform="translate(1.5, 1.5)" />
    <path
      d="M12 2 L13.5 4.5 L16.5 4 L17 7 L20 8 L19 11 L21.5 12.5 L19 14 L20 17 L17 17.5 L16.5 20.5 L13.5 20 L12 22.5 L10.5 20 L7.5 20.5 L7 17.5 L4 17 L5 14 L2.5 12.5 L5 11 L4 8 L7 7 L7.5 4 L10.5 4.5 Z"
      fill="#fb923c"
      stroke="#111111"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12.5" r="3" fill="#ffffff" stroke="#111111" strokeWidth="1.75" />
  </svg>
);

/**
 * 13. PopArtBook:
 * Lavender open book with red ribbon bookmark and bold black outlines.
 */
export const PopArtBook: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <g transform="translate(1.5, 1.5)">
      <path d="M3 5 C5 4, 9 4, 12 6 C15 4, 19 4, 21 5 V19 C19 18, 15 18, 12 20 C9 18, 5 18, 3 19 Z" fill="#111111" />
    </g>
    <path
      d="M3 5 C5 4, 9 4, 12 6 C15 4, 19 4, 21 5 V19 C19 18, 15 18, 12 20 C9 18, 5 18, 3 19 Z"
      fill="#e9d5ff"
      stroke="#111111"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <line x1="12" y1="6" x2="12" y2="20" stroke="#111111" strokeWidth="2" />
    <path d="M12 6 V13 L14 11 L16 13 V6 Z" fill="#f43f5e" stroke="#111111" strokeWidth="1.2" />
  </svg>
);

/**
 * 14. PopArtArrowRight:
 * Bold comic arrow with thick black stroke.
 */
export const PopArtArrowRight: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path
      d="M4 12 H18 M13 6 L19 12 L13 18"
      stroke="#111111"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 15. PopArtLogOut:
 * Red exit arrow emerging from black door frame.
 */
export const PopArtLogOut: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path d="M9 3 H4 V21 H9" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13 8 L18 12 L13 16" fill="none" stroke="#e03a3e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="7" y1="12" x2="18" y2="12" stroke="#e03a3e" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/**
 * 16. PopArtAward (Reputation):
 * Gold medal with blue ribbon.
 */
export const PopArtAward: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path d="M8 12 L6 22 L12 19 L18 22 L16 12" fill="#0284c7" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="12" cy="8.5" r="6.5" fill="#facc15" stroke="#111111" strokeWidth="2" />
    <circle cx="12" cy="8.5" r="4" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.25" />
  </svg>
);

/**
 * 17. PopArtWifi (Facilities):
 * Cyan/yellow antenna signal with bold black strokes.
 */
export const PopArtWifi: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path d="M5 8.5 C9 5 15 5 19 8.5" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
    <path d="M5 8.5 C9 5 15 5 19 8.5" stroke="#38bdf8" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M8 12.5 C10.5 10.5 13.5 10.5 16 12.5" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
    <path d="M8 12.5 C10.5 10.5 13.5 10.5 16 12.5" stroke="#facc15" strokeWidth="1.75" strokeLinecap="round" />
    <circle cx="12" cy="17" r="2.5" fill="#f43f5e" stroke="#111111" strokeWidth="2" />
  </svg>
);

/**
 * 18. PopArtBriefcase (Opportunities):
 * Orange briefcase with brown handle and brass lock.
 */
export const PopArtBriefcase: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <rect x="3" y="7" width="18" height="14" rx="2" fill="#111111" transform="translate(1.5, 1.5)" />
    <path d="M9 7 V4 H15 V7" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3" y="7" width="18" height="14" rx="2" fill="#fb923c" stroke="#111111" strokeWidth="2" />
    <line x1="3" y1="12" x2="21" y2="12" stroke="#111111" strokeWidth="1.5" />
    <rect x="10.5" y="10.5" width="3" height="3" rx="0.5" fill="#facc15" stroke="#111111" strokeWidth="1.25" />
  </svg>
);

/**
 * 19. PopArtUsers (Clubs & Community):
 * Pop-art duo with sunglasses.
 */
export const PopArtUsers: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <circle cx="9" cy="8" r="4" fill="#f472b6" stroke="#111111" strokeWidth="2" />
    <path d="M3 19 C3 15.5 6 14 9 14 C12 14 15 15.5 15 19" fill="#bae6fd" stroke="#111111" strokeWidth="2" />
    <circle cx="16" cy="9" r="3.5" fill="#facc15" stroke="#111111" strokeWidth="2" />
    <path d="M12.5 19 C12.5 16.5 14 15 16.5 15 C19 15 21 16.5 21 19" fill="#0284c7" stroke="#111111" strokeWidth="2" />
  </svg>
);

/**
 * 20. PopArtSmile (Happiness):
 * Sunny yellow smiley with bold black eyes and smile.
 */
export const PopArtSmile: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <circle cx="12" cy="12" r="9" fill="#111111" transform="translate(1.5, 1.5)" />
    <circle cx="12" cy="12" r="9" fill="#facc15" stroke="#111111" strokeWidth="2" />
    <circle cx="9" cy="10" r="1.5" fill="#111111" />
    <circle cx="15" cy="10" r="1.5" fill="#111111" />
    <path d="M8 14.5 C9.5 17 14.5 17 16 14.5" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * 21. PopArtGraduationCap (Education):
 * Mortarboard cap with gold tassel.
 */
export const PopArtGraduationCap: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <polygon points="12,3 22,8 12,13 2,8" fill="#111111" transform="translate(1, 1)" />
    <polygon points="12,3 22,8 12,13 2,8" fill="#0284c7" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
    <path d="M6 10.5 V15.5 C6 17.5 9 19.5 12 19.5 C15 19.5 18 17.5 18 15.5 V10.5" fill="#38bdf8" stroke="#111111" strokeWidth="2" />
    <path d="M20 9 V16" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
    <circle cx="20" cy="16.5" r="1.5" fill="#facc15" stroke="#111111" strokeWidth="1" />
  </svg>
);

/**
 * 22. PopArtMessageSquare (Chat / Reviews):
 * Comic speech bubble with yellow fill, black outline, and comic lines.
 */
export const PopArtMessageSquare: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path d="M21 15 C21 16.1 20.1 17 19 17 H7 L3 21 V5 C3 3.9 3.9 3 5 3 H19 C20.1 3 21 3.9 21 5 Z" fill="#111111" transform="translate(1.5, 1.5)" />
    <path
      d="M21 15 C21 16.1 20.1 17 19 17 H7 L3 21 V5 C3 3.9 3.9 3 5 3 H19 C20.1 3 21 3.9 21 5 Z"
      fill="#fef08a"
      stroke="#111111"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <line x1="7" y1="8" x2="17" y2="8" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
    <line x1="7" y1="12" x2="13" y2="12" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * 23. PopArtFilter:
 * Pop-art funnel with cyan body, orange accents, and drop shadow.
 */
export const PopArtFilter: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <polygon points="2,3 22,3 14,12.5 14,19 10,21 10,12.5" fill="#111111" transform="translate(1.5, 1.5)" />
    <polygon
      points="2,3 22,3 14,12.5 14,19 10,21 10,12.5"
      fill="#38bdf8"
      stroke="#111111"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M5 5 H19 L13 12 H11 Z" fill="#facc15" stroke="#111111" strokeWidth="1" />
  </svg>
);

/**
 * 24. PopArtRotateCcw (Reset):
 * Playful reset arrow with yellow curved arrow and drop shadow.
 */
export const PopArtRotateCcw: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path d="M3 12 A9 9 0 1 0 6 5.3 L3 8" stroke="#111111" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 3 V8 H8" stroke="#111111" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 12 A9 9 0 1 0 6 5.3 L3 8" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 3 V8 H8" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 25. PopArtCheck:
 * Pop-art checkmark with vibrant green background badge and crisp white tick.
 */
export const PopArtCheck: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <circle cx="12" cy="12" r="9" fill="#111111" transform="translate(1.5, 1.5)" />
    <circle cx="12" cy="12" r="9" fill="#22c55e" stroke="#111111" strokeWidth="2" />
    <path d="M8 12 L11 15 L16 9" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 26. PopArtX (Close):
 * Pop-art 'X' with red rounded badge or bold comic lines.
 */
export const PopArtX: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <circle cx="12" cy="12" r="9" fill="#111111" transform="translate(1.5, 1.5)" />
    <circle cx="12" cy="12" r="9" fill="#f43f5e" stroke="#111111" strokeWidth="2" />
    <path d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * 27. PopArtChevronLeft / PopArtChevronRight:
 * Bold directional chevrons for pagination.
 */
export const PopArtChevronLeft: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <rect x="3" y="3" width="18" height="18" rx="4" fill="#111111" transform="translate(1.5, 1.5)" />
    <rect x="3" y="3" width="18" height="18" rx="4" fill="#ffffff" stroke="#111111" strokeWidth="2" />
    <path d="M14 8 L10 12 L14 16" stroke="#111111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PopArtChevronRight: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <rect x="3" y="3" width="18" height="18" rx="4" fill="#111111" transform="translate(1.5, 1.5)" />
    <rect x="3" y="3" width="18" height="18" rx="4" fill="#ffffff" stroke="#111111" strokeWidth="2" />
    <path d="M10 8 L14 12 L10 16" stroke="#111111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 28. PopArtFlag:
 * Comic flag waving on pole.
 */
export const PopArtFlag: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path d="M5 21 V3" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M5 4 H18 C19 4 19 6 18 7 L16 9 L18 11 C19 12 19 14 18 14 H5" fill="#f43f5e" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="5" cy="3" r="1.5" fill="#facc15" stroke="#111111" strokeWidth="1" />
  </svg>
);

/**
 * 29. PopArtSend:
 * Comic paper plane in sky blue with yellow speed streaks.
 */
export const PopArtSend: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <polygon points="22,2 15,22 11,13 2,9" fill="#111111" transform="translate(1.5, 1.5)" />
    <polygon points="22,2 15,22 11,13 2,9" fill="#38bdf8" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
    <line x1="22" y1="2" x2="11" y2="13" stroke="#111111" strokeWidth="2" />
    <line x1="11" y1="13" x2="15" y2="22" stroke="#bae6fd" strokeWidth="1.5" />
  </svg>
);

/**
 * 30. PopArtAlertTriangle:
 * Yellow hazard triangle with black outline and exclamation mark.
 */
export const PopArtAlertTriangle: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <polygon points="12,2 22,20 2,20" fill="#111111" transform="translate(1.5, 1.5)" />
    <polygon points="12,2 22,20 2,20" fill="#facc15" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
    <line x1="12" y1="9" x2="12" y2="13" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="16.5" r="1.25" fill="#111111" />
  </svg>
);

/**
 * 31. PopArtAlertCircle:
 * Orange warning circle with exclamation.
 */
export const PopArtAlertCircle: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <circle cx="12" cy="12" r="9" fill="#111111" transform="translate(1.5, 1.5)" />
    <circle cx="12" cy="12" r="9" fill="#fb923c" stroke="#111111" strokeWidth="2" />
    <line x1="12" y1="8" x2="12" y2="12" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="15.5" r="1.25" fill="#ffffff" />
  </svg>
);

/**
 * 32. PopArtHelpCircle:
 * Pop-art question mark badge.
 */
export const PopArtHelpCircle: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <circle cx="12" cy="12" r="9" fill="#111111" transform="translate(1.5, 1.5)" />
    <circle cx="12" cy="12" r="9" fill="#818cf8" stroke="#111111" strokeWidth="2" />
    <path d="M9.5 9 C9.5 7.5 10.5 6.5 12 6.5 C13.5 6.5 14.5 7.5 14.5 9 C14.5 10.5 12 11.5 12 13" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1.25" fill="#ffffff" />
  </svg>
);

/**
 * 33. PopArtExternalLink:
 * Pop-art box with outgoing arrow.
 */
export const PopArtExternalLink: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path d="M18 13 V19 C18 20 17 21 16 21 H5 C4 21 3 20 3 19 V8 C3 7 4 6 5 6 H11" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
    <polyline points="15,3 21,3 21,9" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="10" y1="14" x2="21" y2="3" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * 34. PopArtShield (Safety / Security):
 * Pop-art blue security shield with star badge and hard drop shadow.
 */
export const PopArtShield: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path d="M12 2 L20 5 V11 C20 16.5 16.5 21 12 22 C7.5 21 4 16.5 4 11 V5 L12 2 Z" fill="#111111" transform="translate(1.5, 1.5)" />
    <path
      d="M12 2 L20 5 V11 C20 16.5 16.5 21 12 22 C7.5 21 4 16.5 4 11 V5 L12 2 Z"
      fill="#38bdf8"
      stroke="#111111"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M12 7 L13.5 10.5 L17 11 L14.5 13.5 L15 17 L12 15 L9 17 L9.5 13.5 L7 11 L10.5 10.5 Z" fill="#facc15" stroke="#111111" strokeWidth="1" />
  </svg>
);

/**
 * 35. PopArtUtensils (Food / Dining):
 * Pop-art fork and knife with colorful handles and drop shadow.
 */
export const PopArtUtensils: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    {/* Fork */}
    <path d="M5 3 V9 C5 10.5 6 11.5 7.5 11.5 V21 H8.5 V11.5 C10 11.5 11 10.5 11 9 V3" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
    <line x1="8" y1="3" x2="8" y2="8" stroke="#111111" strokeWidth="1.5" />
    <rect x="7" y="13" width="2" height="7" rx="1" fill="#f43f5e" />
    {/* Knife */}
    <path d="M15 3 C15 3 19 4.5 19 10 C19 12 17.5 13 16 13 V21 H15 V3 Z" fill="#facc15" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

/**
 * 36. PopArtTrash:
 * Pop-art red trash can with lid, handle, and bold black outline.
 */
export const PopArtTrash: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <g transform="translate(1.5, 1.5)">
      <path d="M4 6 H20 V7 H4 Z M6 7 L7 20 H17 L18 7 Z" fill="#111111" />
    </g>
    {/* Can body */}
    <path d="M6 7 L7 20 H17 L18 7 Z" fill="#fee2e2" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
    <line x1="10" y1="10" x2="10" y2="17" stroke="#e03a3e" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14" y1="10" x2="14" y2="17" stroke="#e03a3e" strokeWidth="1.5" strokeLinecap="round" />
    {/* Lid */}
    <path d="M3 6 H21" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M9 6 V3 H15 V6" fill="#f43f5e" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

/**
 * 37. PopArtLock:
 * Pop-art golden padlock with silver shackle and bold black outline.
 */
export const PopArtLock: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <g transform="translate(1.5, 1.5)">
      <rect x="4" y="10" width="16" height="12" rx="2" fill="#111111" />
    </g>
    {/* Shackle */}
    <path d="M7 10 V6 C7 3.2 9.2 1 12 1 C14.8 1 17 3.2 17 6 V10" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
    <path d="M7 10 V6 C7 3.2 9.2 1 12 1 C14.8 1 17 3.2 17 6 V10" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" />
    {/* Body */}
    <rect x="4" y="10" width="16" height="12" rx="2" fill="#facc15" stroke="#111111" strokeWidth="2" />
    {/* Keyhole */}
    <circle cx="12" cy="15" r="2" fill="#111111" />
    <polygon points="11,15 13,15 12.5,18.5 11.5,18.5" fill="#111111" />
  </svg>
);

/**
 * 38. PopArtLogIn:
 * Pop-art door with entering arrow.
 */
export const PopArtLogIn: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path d="M15 3 H19 V21 H15" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 8 L15 12 L10 16" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="12" x2="15" y2="12" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/**
 * 39. PopArtFileText:
 * Document icon in sky blue with folded corner and comic shadow.
 */
export const PopArtFileText: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path d="M14 2 H6 C4.9 2 4 2.9 4 4 V20 C4 21.1 4.9 22 6 22 H18 C19.1 22 20 21.1 20 20 V8 L14 2 Z" fill="#111111" transform="translate(1.5, 1.5)" />
    <path d="M14 2 H6 C4.9 2 4 2.9 4 4 V20 C4 21.1 4.9 22 6 22 H18 C19.1 22 20 21.1 20 20 V8 L14 2 Z" fill="#e0f2fe" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
    <polygon points="14,2 14,8 20,8" fill="#bae6fd" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
    <line x1="8" y1="13" x2="16" y2="13" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
    <line x1="8" y1="17" x2="14" y2="17" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * 40. PopArtChevronDown:
 * Bold directional chevron for dropdown menus and carets.
 */
export const PopArtChevronDown: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path d="M6 9 L12 15 L18 9" stroke="#111111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 41. PopArtChevronUp:
 * Bold directional upward chevron.
 */
export const PopArtChevronUp: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path d="M6 15 L12 9 L18 15" stroke="#111111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 42. PopArtArrowLeft:
 * Bold comic arrow pointing left.
 */
export const PopArtArrowLeft: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path
      d="M20 12 H6 M11 6 L5 12 L11 18"
      stroke="#111111"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 43. PopArtInfo:
 * Sky blue information badge with bold comic shadow.
 */
export const PopArtInfo: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <circle cx="12" cy="12" r="9" fill="#111111" transform="translate(1.5, 1.5)" />
    <circle cx="12" cy="12" r="9" fill="#38bdf8" stroke="#111111" strokeWidth="2" />
    <circle cx="12" cy="8" r="1.5" fill="#111111" />
    <line x1="12" y1="11" x2="12" y2="16.5" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * 44. PopArtHome:
 * Pop-art house with bold outlines, red roof, and yellow walls.
 */
export const PopArtHome: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <g transform="translate(1.5, 1.5)">
      <polygon points="12,2 2,11 5,11 5,21 19,21 19,11 22,11" fill="#111111" />
    </g>
    {/* House walls */}
    <rect x="5" y="10" width="14" height="11" fill="#facc15" stroke="#111111" strokeWidth="2" />
    {/* Roof */}
    <polygon points="12,2 2,11 22,11" fill="#f43f5e" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
    {/* Door */}
    <rect x="10" y="14" width="4" height="7" fill="#111111" />
  </svg>
);

/**
 * 45. PopArtClock:
 * Pop-art round clock with bold hands and comic shadow.
 */
export const PopArtClock: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <circle cx="12" cy="12" r="9" fill="#111111" transform="translate(1.5, 1.5)" />
    <circle cx="12" cy="12" r="9" fill="#fef08a" stroke="#111111" strokeWidth="2" />
    <polyline points="12,7 12,12 16,14" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="1.5" fill="#e03a3e" />
  </svg>
);

/**
 * 46. PopArtArrowUpDown:
 * Two vertical arrows for sorting with bold comic lines.
 */
export const PopArtArrowUpDown: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path d="M7 20 V4 M3 8 L7 4 L11 8" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 4 V20 M13 16 L17 20 L21 16" stroke="#e03a3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 47. PopArtLayoutDashboard:
 * Neo-brutalist pop-art dashboard with 4 colorful tiles and bold drop shadow.
 */
export const PopArtLayoutDashboard: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <g transform="translate(1.5, 1.5)">
      <rect x="3" y="3" width="7" height="9" rx="1" fill="#111111" />
      <rect x="14" y="3" width="7" height="5" rx="1" fill="#111111" />
      <rect x="14" y="12" width="7" height="9" rx="1" fill="#111111" />
      <rect x="3" y="16" width="7" height="5" rx="1" fill="#111111" />
    </g>
    <rect x="3" y="3" width="7" height="9" rx="1" fill="#facc15" stroke="#111111" strokeWidth="2" />
    <rect x="14" y="3" width="7" height="5" rx="1" fill="#38bdf8" stroke="#111111" strokeWidth="2" />
    <rect x="14" y="12" width="7" height="9" rx="1" fill="#f43f5e" stroke="#111111" strokeWidth="2" />
    <rect x="3" y="16" width="7" height="5" rx="1" fill="#6ee7b7" stroke="#111111" strokeWidth="2" />
  </svg>
);

/**
 * 48. PopArtScale:
 * Pop-art scales of justice with yellow and sky-blue balanced pans.
 */
export const PopArtScale: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <line x1="12" y1="3" x2="12" y2="21" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="5" y1="7" x2="19" y2="7" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="8" y1="21" x2="16" y2="21" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
    {/* Left Pan */}
    <path d="M5 7 L2 13 H8 Z" fill="#facc15" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
    {/* Right Pan */}
    <path d="M19 7 L16 13 H22 Z" fill="#38bdf8" stroke="#111111" strokeWidth="2" strokeLinejoin="round" />
    {/* Fulcrum top */}
    <circle cx="12" cy="4" r="1.5" fill="#f43f5e" stroke="#111111" strokeWidth="1.5" />
  </svg>
);

/**
 * 49. PopArtGitMerge:
 * Pop-art branch merge nodes in blue, yellow, and rose.
 */
export const PopArtGitMerge: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <line x1="6" y1="6" x2="6" y2="18" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M6 18 C6 13, 18 15, 18 10" stroke="#111111" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <circle cx="6" cy="6" r="3" fill="#38bdf8" stroke="#111111" strokeWidth="2" />
    <circle cx="6" cy="18" r="3" fill="#facc15" stroke="#111111" strokeWidth="2" />
    <circle cx="18" cy="9" r="3" fill="#f43f5e" stroke="#111111" strokeWidth="2" />
  </svg>
);

/**
 * 50. PopArtBot:
 * Pop-art friendly crawler bot head with antenna and sky-blue chassis.
 */
export const PopArtBot: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <g transform="translate(1.5, 1.5)">
      <rect x="4" y="7" width="16" height="13" rx="2" fill="#111111" />
    </g>
    <line x1="12" y1="2" x2="12" y2="7" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="2" r="1.5" fill="#e03a3e" />
    <rect x="1" y="11" width="3" height="5" rx="1" fill="#111111" />
    <rect x="20" y="11" width="3" height="5" rx="1" fill="#111111" />
    <rect x="4" y="7" width="16" height="13" rx="2" fill="#bae6fd" stroke="#111111" strokeWidth="2" />
    <circle cx="9" cy="13" r="2" fill="#111111" />
    <circle cx="15" cy="13" r="2" fill="#111111" />
    <circle cx="9.5" cy="12.5" r="0.6" fill="#ffffff" />
    <circle cx="15.5" cy="12.5" r="0.6" fill="#ffffff" />
    <line x1="9" y1="17" x2="15" y2="17" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * 51. PopArtActivity:
 * Pop-art system health pulse wave with vibrant emerald trace.
 */
export const PopArtActivity: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path
      d="M2 12 H6 L9 3 L14 21 L18 12 H22"
      stroke="#111111"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(1, 1)"
    />
    <path
      d="M2 12 H6 L9 3 L14 21 L18 12 H22"
      stroke="#10b981"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 52. PopArtMail:
 * Pop-art envelope with warm amber fill, red seal, and comic drop shadow.
 */
export const PopArtMail: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <g transform="translate(1.5, 1.5)">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#111111" />
    </g>
    <rect x="2" y="4" width="20" height="16" rx="2" fill="#fed7aa" stroke="#111111" strokeWidth="2" />
    <path d="M2 7 L12 14 L22 7" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="14" r="2" fill="#f43f5e" stroke="#111111" strokeWidth="1.5" />
  </svg>
);

/**
 * 53. PopArtMenu:
 * Pop-art 3 hamburger bars in bright yellow, sky-blue, and pink.
 */
export const PopArtMenu: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <g transform="translate(1, 1)">
      <line x1="3" y1="6" x2="21" y2="6" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
    </g>
    <line x1="3" y1="6" x2="21" y2="6" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="3" y1="12" x2="21" y2="12" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="3" y1="18" x2="21" y2="18" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * 54. PopArtShieldCheck:
 * Pop-art shield with mint fill, bold black outline, and emerald checkmark.
 */
export const PopArtShieldCheck: React.FC<IconProps> = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
    <path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      fill="#111111"
      transform="translate(1.5, 1.5)"
    />
    <path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      fill="#6ee7b7"
      stroke="#111111"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <polyline points="9,12 11,14 15,9" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);





