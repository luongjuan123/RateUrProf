"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/locales/i18n";
import { PopArtX, PopArtCheck } from "@/components/icons/PopArtIcons";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnUrl?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, returnUrl }) => {
  const { signInWithGoogle } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const authErr = params.get("auth_error");
      if (authErr === "google_credentials_missing") {
        setError(t("authModal.credentialsMissing"));
      } else if (authErr) {
        setError(authErr);
      }
    }
  }, [isOpen, t]);

  if (!isOpen) return null;

  const handleGoogleSignIn = () => {
    try {
      setLoading(true);
      setError(null);
      signInWithGoogle(returnUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border border-gray-200 overflow-hidden">
        {/* Editorial Top Accent Stripe */}
        <div className="h-1 bg-[#1d4ed8] w-full" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-gray-200 bg-white">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1d4ed8]">
              {t("authModal.communityTag")}
            </span>
            <h2 className="text-xl font-mono font-bold text-black tracking-tight">
              {t("authModal.title")}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            <PopArtX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] text-xs font-mono font-bold text-[#1d4ed8]">
              {error}
            </div>
          )}

          <p className="text-xs font-mono text-gray-700 leading-relaxed">
            {t("authModal.quickDesc")}
          </p>

          {/* Genuine Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-black font-mono font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? t("authModal.processing") : t("authModal.googleBtn")}</span>
          </button>

          <div className="pt-4 border-t border-gray-200 flex items-start gap-2 text-[11px] font-mono text-gray-700 leading-normal">
            <PopArtCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#1d4ed8]" />
            <span>{t("authModal.trustNotice")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
