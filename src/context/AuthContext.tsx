"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UserProfile, AccountStatus } from "@/types";
import { setActiveBookmarkUser } from "@/lib/bookmarks";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  role?: "student" | "admin" | "moderator" | "super_admin" | "support" | "security";
  cohort?: string;
  status?: AccountStatus;
  lockReason?: string | null;
  lockedAt?: number | null;
  deletionRequestedAt?: number | null;
  deletionScheduledAt?: number | null;
}

export type User = AuthUser;

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isLocked: boolean;
  isPendingDeletion: boolean;
  refreshUser: () => Promise<void>;
  signInWithGoogle: (returnUrl?: string) => void;
  logOut: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  isAuthModalOpen: boolean;
  authReturnUrl?: string;
  openAuthModal: (returnUrl?: string) => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isLocked: false,
  isPendingDeletion: false,
  refreshUser: async () => {},
  signInWithGoogle: () => {},
  logOut: async () => {},
  updateUserProfile: async () => {},
  isAuthModalOpen: false,
  authReturnUrl: undefined,
  openAuthModal: () => {},
  closeAuthModal: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authReturnUrl, setAuthReturnUrl] = useState<string | undefined>(undefined);

  const pathname = usePathname();
  const router = useRouter();

  const isLocked = Boolean(user && (user.status === "locked" || user.status === "suspended"));
  const isPendingDeletion = Boolean(user && user.status === "pending_deletion");

  const openAuthModal = (returnUrl?: string) => {
    setAuthReturnUrl(returnUrl);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthReturnUrl(undefined);
  };

  // Restore existing session on mount from GCP-native session cookie
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.user) {
            setUser(data.user);
            setUserProfile(data.profile);
          }
        }
      } catch (err) {
        console.warn("[AuthContext] Session restoration notice:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Initiates real Google OAuth 2.0 / OpenID Connect authentication flow.
   * Redirects user to Google's genuine account selector & consent screen.
   */
  const signInWithGoogle = (returnUrl?: string) => {
    const target =
      returnUrl ||
      (typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/");

    if (typeof window !== "undefined") {
      window.location.href = `/api/auth/google/signin?returnUrl=${encodeURIComponent(
        target
      )}`;
    }
  };

  useEffect(() => {
    setActiveBookmarkUser(user?.uid || null);
  }, [user?.uid]);

  const logOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("[Auth] Logout notice:", err);
    } finally {
      setUser(null);
      setUserProfile(null);
      setActiveBookmarkUser(null);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.profile) {
          setUserProfile(result.profile);
        }
      }
    } catch (err) {
      console.warn("[Auth] Update profile error:", err);
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
        setUserProfile(data.profile || null);
      }
    } catch (err) {
      console.warn("[AuthContext] Session refresh error:", err);
    }
  }, []);

  // Proactively route locked accounts away from regular interactive pages to the /locked page
  useEffect(() => {
    if (loading || !user) return;
    if (isLocked) {
      const isLockedPage = pathname?.includes("/locked");
      const isRecoveryPage = pathname?.includes("/account/recover");
      if (!isLockedPage && !isRecoveryPage) {
        const lang = pathname?.startsWith("/en") ? "en" : "vi";
        router.replace(`/${lang}/locked`);
      }
    }
  }, [loading, user, isLocked, pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isLocked,
        isPendingDeletion,
        refreshUser,
        signInWithGoogle,
        logOut,
        updateUserProfile,
        isAuthModalOpen,
        authReturnUrl,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

