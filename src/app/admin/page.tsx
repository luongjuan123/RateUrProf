"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { RotateCw } from "lucide-react";
import {
  PopArtAlertCircle,
  PopArtAlertTriangle,
  PopArtLock,
  PopArtArrowLeft,
  PopArtLogOut,
} from "@/components/icons/PopArtIcons";

function AdminPageContent({ lang = "vi" }: { lang?: string }) {
  const { user, loading: authLoading, signInWithGoogle, logOut } = useAuth();
  const [authErrorParam, setAuthErrorParam] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("auth_error");
      if (err) setAuthErrorParam(err);
    }
  }, []);

  const isSuperAdminCanonical =
    user?.email?.trim().toLowerCase() === "dungpubgame@gmail.com";
  const isAuthorizedAdmin =
    isSuperAdminCanonical ||
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "moderator" ||
    user?.role === "support" ||
    user?.role === "security";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <RotateCw className="w-8 h-8 animate-spin text-gray-950" />
          <p className="text-xs uppercase font-mono font-bold tracking-widest text-gray-500">
            Đang xác thực phiên quản trị viên Google OAuth...
          </p>
        </div>
      </div>
    );
  }

  // Case 1: Unauthenticated -> Sign In with Google Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border-2 border-gray-900 p-8 shadow-2xl">
          <div className="h-1.5 bg-[#e03a3e] -mt-8 -mx-8 mb-6" />
          <div className="w-12 h-12 bg-red-50 flex items-center justify-center mb-4 border border-red-200 shadow-[2px_2px_0px_#111]">
            <PopArtLock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black uppercase text-gray-950 tracking-tight mb-2">
            Yêu cầu Đăng nhập Quản trị
          </h1>
          <p className="text-xs text-gray-600 leading-relaxed mb-6">
            Bảng điều khiển Quản trị RateUrProfs được bảo vệ nghiêm ngặt. Vui lòng đăng nhập bằng tài khoản Google được cấp thẩm quyền quản trị hệ thống.
          </p>

          {authErrorParam === "google_credentials_missing" && (
            <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <PopArtAlertTriangle className="w-4 h-4 shrink-0" />
                <span>Chưa liên kết Google OAuth Credentials</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Cần cấu hình biến môi trường GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trên Google Cloud Platform.
              </p>
            </div>
          )}

          <button
            onClick={() => signInWithGoogle("/admin")}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Đăng nhập với Google</span>
          </button>
        </div>
      </div>
    );
  }

  // Case 2: Authenticated but unauthorized (Role = student / not in admin matrix)
  if (!isAuthorizedAdmin) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border-2 border-red-600 p-8 shadow-2xl">
          <div className="h-1.5 bg-red-600 -mt-8 -mx-8 mb-6" />
          <div className="w-12 h-12 bg-red-100 flex items-center justify-center mb-4 border border-red-200 shadow-[2px_2px_0px_#111]">
            <PopArtAlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black uppercase text-gray-950 tracking-tight mb-2">
            Truy cập bị từ chối (403 Forbidden)
          </h1>
          <p className="text-xs text-gray-600 leading-relaxed mb-4">
            Tài khoản <span className="font-bold text-gray-900">{user.email}</span> hiện đang ở vai trò{" "}
            <span className="font-mono uppercase font-bold text-gray-800">{user.role || "student"}</span> và không có thẩm quyền truy cập hệ thống quản trị.
          </p>

          <div className="p-3 bg-red-50 border border-red-200 text-[11px] text-red-900 font-semibold mb-6">
            Nếu bạn là quản trị viên hoặc kiểm duyệt viên được phân quyền, vui lòng liên hệ Super Administrator (<span className="underline">dungpubgame@gmail.com</span>) để kích hoạt vai trò.
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <PopArtArrowLeft className="w-4 h-4" />
              <span>Quay lại Trang chủ</span>
            </Link>

            <button
              onClick={() => logOut()}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <PopArtLogOut className="w-4 h-4" />
              <span>Đổi tài khoản khác</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Authorized Admin -> Mount Admin Application Shell
  return (
    <AdminLayout
      lang={lang}
      initialUser={{
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: (isSuperAdminCanonical ? "super_admin" : (user.role || "admin")) as "super_admin" | "admin" | "moderator" | "support" | "security" | "student",
      }}
    />
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <RotateCw className="w-8 h-8 animate-spin text-gray-950" />
            <span className="text-xs uppercase font-mono font-bold tracking-widest text-gray-500">
              Đang khởi tạo không gian quản trị...
            </span>
          </div>
        </div>
      }
    >
      <AdminPageContent lang="vi" />
    </Suspense>
  );
}
