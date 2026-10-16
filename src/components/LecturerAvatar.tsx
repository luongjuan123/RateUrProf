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
 * Strict Rule Compliance (Section 5):
 * - Sharp 90-degree corners (rectangular frame, rounded-none).
 * - Neutral, simple silhouette icon when photo is missing or unverified.
 * - ZERO AI-generated human portraits or random stock images.
 * - Explicit image status tracking: 'verified_photo' | 'default_avatar' | 'pending_verification'.
 */
export const LecturerAvatar: React.FC<LecturerAvatarProps> = ({
  name,
  photoUrl,
  photoStatus = "default_avatar",
  className = "w-full h-full",
  showInitials = true,
}) => {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);

  // Compute initials (last 2 words if available)
  const getInitials = (fullName: string): string => {
    if (!fullName) return "GV";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isVerifiedPhoto = photoStatus === "verified_photo" && Boolean(photoUrl) && !imageError;

  return (
    <div
      className={`relative rounded-none overflow-hidden bg-gray-100 border border-gray-200 select-none ${className}`}
      role="img"
      aria-label={
        isVerifiedPhoto
          ? `Ảnh chân dung chính thức của ${name}`
          : t("common.defaultAvatarLabel")
      }
    >
      {isVerifiedPhoto ? (
        <img
          src={photoUrl!}
          alt={`Chân dung ${name}`}
          className="w-full h-full object-cover object-top rounded-none"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : (
        /* Neutral Generic Silhouette Placeholder with Sharp 90-Degree Corners */
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 text-gray-400 p-2 text-center rounded-none relative">
          {/* Neutral generic silhouette SVG */}
          <svg
            className="w-1/2 h-1/2 max-w-[56px] max-h-[56px] text-gray-400"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M12 2a5 5 0 100 10 5 5 0 000-10zM4 21a8 8 0 0116 0H4z"
              clipRule="evenodd"
            />
          </svg>

          {showInitials && (
            <span className="text-[11px] font-black text-gray-500 tracking-wider mt-1 uppercase font-mono">
              {getInitials(name)}
            </span>
          )}

          <span className="sr-only">
            {t("common.defaultAvatarLabel")}
          </span>
        </div>
      )}
    </div>
  );
};
