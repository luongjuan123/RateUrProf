"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/locales/i18n";
import { X, Mail, Lock, User, Shield, CheckCircle2 } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle, signInAnonymouslyWithCohort, signInWithEmail, registerWithEmail } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState<"quick" | "email">("quick");
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [cohort, setCohort] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInAnonymouslyWithCohort(cohort.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      if (isRegister) {
        if (!displayName.trim()) {
          setError(t("authModal.nameRequired"));
          return;
        }
        await registerWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border-2 border-gray-900 overflow-hidden">
        {/* Editorial Top Accent Stripe */}
        <div className="h-1.5 bg-[#e03a3e] w-full" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#e03a3e]">
              {t("authModal.communityTag")}
            </span>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
              {t("authModal.title")}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 bg-gray-50/50">
          <button
            onClick={() => { setTab("quick"); setError(null); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${
              tab === "quick"
                ? "bg-white text-gray-900 border-b-2 border-[#e03a3e]"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t("authModal.tabQuick")}
          </button>
          <button
            onClick={() => { setTab("email"); setError(null); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${
              tab === "email"
                ? "bg-white text-gray-900 border-b-2 border-[#e03a3e]"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t("authModal.tabEmail")}
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {tab === "quick" ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                {t("authModal.quickDesc")}
              </p>

              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
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
                <span>{t("authModal.googleBtn")}</span>
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                  <span className="bg-white px-2 text-gray-400">{t("authModal.orAnonymous")}</span>
                </div>
              </div>

              {/* Guest / Anonymous Sign In */}
              <div className="bg-gray-50 p-4 border border-gray-200 space-y-3">
                <div className="flex items-center gap-2 text-gray-900 font-semibold text-xs">
                  <Shield className="w-4 h-4 text-[#e03a3e]" />
                  <span>{t("authModal.anonTitle")}</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {t("authModal.anonDesc")}
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {t("authModal.cohortLabel")}
                  </label>
                  <input
                    type="text"
                    value={cohort}
                    onChange={(e) => setCohort(e.target.value)}
                    placeholder={t("authModal.cohortPlaceholder")}
                    className="w-full px-3 py-2 text-xs border border-gray-300 focus:outline-none focus:border-black bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGuestSignIn}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {loading ? t("authModal.processing") : t("authModal.anonBtn")}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {isRegister && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {t("authModal.displayNameLabel")}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t("authModal.displayNamePlaceholder")}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {t("authModal.emailLabel")}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu.vn"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {t("authModal.passwordLabel")}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#e03a3e] hover:bg-[#b91c1c] text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? t("authModal.processing") : isRegister ? t("authModal.submitRegister") : t("authModal.submitLogin")}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-xs text-gray-600 hover:text-black font-medium underline"
                >
                  {isRegister ? t("authModal.haveAccount") : t("authModal.noAccount")}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-start gap-2 text-[11px] text-gray-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{t("authModal.trustNotice")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
