"use client";

import React, { useState } from "react";
import { PhotoStatus } from "@/types";
import { useTranslation } from "@/locales/i18n";

interface LecturerAvatarProps {
  name: string;
  photoUrl?: string | null;
  photoStatus?: PhotoStatus;
  className?: string;
  showInitials?: boolean;
}

/**
 * LecturerAvatar Component
 * Strict Neo-Brutalist Rule Compliance:
 * - 100% sharp 90-degree corners (rounded-none). Never make circles or rounded corners.
 * - Full-bleed rectangular frame: images and initials fill 100% of the box with zero corner gaps.
 * - If a valid real photo exists, display it (object-cover, rounded-none).
 * - If a photo is missing or fails to load, display a sharp Neo-Brutalist initials stamp.
 * - Single border compliance: avoid nested double borders.
 */

// Refined academic palette for Neo-Brutalist initials stamps
const AVATAR_PALETTES = [
  { bg: "#1e3a8a", text: "#ffffff" }, // Navy
  { bg: "#0f766e", text: "#ffffff" }, // Teal
  { bg: "#4338ca", text: "#ffffff" }, // Indigo
  { bg: "#701a75", text: "#ffffff" }, // Fuchsia
  { bg: "#1d4ed8", text: "#ffffff" }, // Royal Blue
  { bg: "#c2410c", text: "#ffffff" }, // Orange Rust
  { bg: "#047857", text: "#ffffff" }, // Forest Green
  { bg: "#1e293b", text: "#ffffff" }, // Slate
  { bg: "#b91c1c", text: "#ffffff" }, // Editorial Red
  { bg: "#581c87", text: "#ffffff" }, // Deep Purple
];

export function getLecturerInitials(name?: string | null): string {
  if (!name || typeof name !== "string") return "GV";
  const cleaned = name
    .replace(/^(?:GS\.?|PGS\.?|TS\.?|ThS\.?|BS\.?|CN\.?|Ths\.?|Ts\.?|Pgs\.?|Gs\.?)\s+/gi, "")
    .replace(/^(?:Giáo sư|Phó giáo sư|Tiến sĩ|Thạc sĩ|Bác sĩ|Cử nhân|Ông|Bà)\s+/gi, "")
    .trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const first = tokens[0][0] || "";
    const last = tokens[tokens.length - 1][0] || "";
    return `${first}${last}`.toUpperCase();
  }
  if (tokens.length === 1 && tokens[0].length >= 1) {
    return tokens[0].substring(0, 2).toUpperCase();
  }
  return "GV";
}

export function getAvatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const colorIndex = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[colorIndex];
}

export function cleanAndFormatAvatarUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // Strictly reject ANY gradient or SVG data URI avatars to eliminate 100% of gradients
  // and ensure 100% solid flat Neo-Brutalist colors with sharp corners.
  if (
    lower.includes("gradient") ||
    lower.includes("lineargradient") ||
    lower.includes("radialgradient") ||
    trimmed.startsWith("data:image/svg+xml")
  ) {
    return null;
  }

  // Filter out known placeholder dummy images
  if (
    lower.includes("no-image") ||
    lower.includes("avatar-default") ||
    lower.includes("default_avatar") ||
    lower.includes("default-avatar") ||
    lower.includes("placeholder")
  ) {
    return null;
  }

  // Handle other raster data URIs (e.g. real user uploaded base64 png/jpeg)
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  // Handle HTTP/HTTPS/relative URLs
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    let formatted = trimmed;
    // Upgrade HTTP to HTTPS for academic domains to prevent mixed-content blocks
    if (formatted.startsWith("http://")) {
      formatted = formatted.replace(/^http:\/\//i, "https://");
    }
    try {
      return encodeURI(decodeURI(formatted));
    } catch {
      return formatted;
    }
  }

  return null;
}

export const LecturerAvatar: React.FC<LecturerAvatarProps> = ({
  name,
  photoUrl,
  photoStatus,
  className = "w-full h-full",
}) => {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);

  const formattedUrl = cleanAndFormatAvatarUrl(photoUrl);

  const hasValidPhotoCandidate =
    !imageError &&
    Boolean(formattedUrl) &&
    (photoStatus === "verified_photo" ||
      photoStatus !== "default_avatar" ||
      Boolean(formattedUrl));

  const initials = getLecturerInitials(name);
  const palette = getAvatarColor(name || "");
  const hasBorder = className.includes("border-") || className.includes("border ");
  const borderClasses = hasBorder ? "" : "border-2 border-black";

  return (
    <div
      className={`@container relative rounded-none overflow-hidden select-none bg-gray-100 ${borderClasses} ${className}`}
      role="img"
      aria-label={
        hasValidPhotoCandidate
          ? `Ảnh chân dung ${name}`
          : t("common.defaultAvatarLabel") || "Ảnh đại diện mặc định"
      }
    >
      {hasValidPhotoCandidate && formattedUrl ? (
        <img
          src={formattedUrl}
          alt=""
          className="w-full h-full object-cover object-top rounded-none"
          onError={() => setImageError(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        /* Full-Bleed Sharp 90-Degree Neo-Brutalist Initials Stamp */
        <div
          className="w-full h-full flex items-center justify-center font-black uppercase text-white select-none rounded-none text-center"
          style={{ backgroundColor: palette.bg }}
        >
          <span
            className="font-black tracking-wider leading-none text-xs"
            style={{ fontSize: "clamp(10px, 38cqi, 36px)" }}
          >
            {initials}
          </span>
          <span className="sr-only">
            {t("common.defaultAvatarLabel") || "Ảnh đại diện mặc định"}
          </span>
        </div>
      )}
    </div>
  );
};

export default LecturerAvatar;
