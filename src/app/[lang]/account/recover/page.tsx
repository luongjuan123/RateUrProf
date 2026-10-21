"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/locales/i18n";
import { RefreshCw } from "lucide-react";
import {
  PopArtCheck,
  PopArtAlertTriangle,
  PopArtArrowRight,
  PopArtShield,
  PopArtHome,
} from "@/components/icons/PopArtIcons";

function AccountRecoverContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { refreshUser } = useAuth();
  const { locale } = useTranslation();
  const router = useRouter();
  const isVi = locale === "vi";

  const [inputToken, setInputToken] = useState(token);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleRecover = async (targetToken?: string) => {
    const raw = (targetToken || inputToken || "").trim();
    if (!raw) {
      setStatus("error");
      setMessage(isVi ? "Vui lòng nhập mã khôi phục tài khoản." : "Please provide a valid recovery token.");
      return;
    }

    setLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      const res = await fetch("/api/account/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: raw }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || (isVi ? "Khôi phục tài khoản thất bại." : "Account recovery failed."));
      } else {
        setStatus("success");
        setMessage(data.message || (isVi ? "Tài khoản của bạn đã được khôi phục thành công!" : "Account restored successfully!"));
        await refreshUser();
      }
    } catch {
      setStatus("error");
      setMessage(isVi ? "Không thể kết nối đến máy chủ." : "Could not reach server.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-attempt recovery if token is present in query URL
  useEffect(() => {
    if (token && status === "idle" && !loading) {
      handleRecover(token);
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_#000] p-6 sm:p-8">
          <div className="flex items-center gap-3 border-b-2 border-black pb-4 mb-6">
            <div className="w-12 h-12 bg-[#bbf7d0] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
              <PopArtShield className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2 py-0.5 bg-[#fef9c3] text-black text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000]">
                {isVi ? "ÂN HẠN 14 NGÀY" : "14-DAY GRACE PERIOD"}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mt-1">
                {isVi ? "Khôi phục Tài khoản RateUrProfs" : "Recover RateUrProfs Account"}
              </h1>
            </div>
          </div>

          {status === "idle" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                {isVi
                  ? "Nếu bạn đã yêu cầu xóa tài khoản trong vòng 14 ngày qua, bạn có thể nhập mã khôi phục để kích hoạt lại tài khoản và khôi phục toàn bộ bài đánh giá của mình."
                  : "If you requested account deletion within the past 14 days, enter your recovery token to reactivate your account and restore all hidden reviews."}
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-900">
                  {isVi ? "Mã xác thực khôi phục" : "Recovery Token"}
                </label>
                <input
                  type="text"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder={isVi ? "Dán mã khôi phục từ email tại đây..." : "Paste recovery token from email..."}
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-bold border-2 border-black bg-white rounded-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-[2px_2px_0px_#000] transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleRecover()}
                  className="w-full px-6 py-3 bg-[#bbf7d0] hover:bg-green-300 text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isVi ? "Đang xác thực & khôi phục..." : "Verifying & restoring..."}</span>
                    </>
                  ) : (
                    <>
                      <PopArtShield className="w-3.5 h-3.5" />
                      <span>{isVi ? "Khôi phục tài khoản ngay" : "Restore Account Now"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-5">
              <div className="p-4 bg-[#dcfce7] border-2 border-black shadow-[3px_3px_0px_#000] flex items-start gap-3">
                <PopArtCheck className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs text-green-950 font-bold space-y-1">
                  <p className="font-black text-sm text-green-900">
                    {isVi ? "Khôi phục thành công!" : "Restored Successfully!"}
                  </p>
                  <p className="leading-relaxed">{message}</p>
                </div>
              </div>

              <div className="p-4 bg-[#f8fafc] border border-black text-xs text-gray-700 space-y-2">
                <p className="font-bold text-black">
                  {isVi ? "Những gì đã được khôi phục:" : "What has been restored:"}
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-gray-800">
                  <li>{isVi ? "Tài khoản trở lại trạng thái hoạt động bình thường." : "Account returned to active status."}</li>
                  <li>{isVi ? "Các bài đánh giá giảng viên & trường đại học đã hiển thị trở lại." : "All your lecturer & university reviews are visible again."}</li>
                  <li>{isVi ? "Điểm số và số lượt đánh giá đã được tự động tính toán lại." : "Ratings and review tallies have been automatically recalculated."}</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Link
                  href={`/${locale}`}
                  className="flex-1 px-5 py-2.5 bg-black text-white hover:bg-gray-800 font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] text-center flex items-center justify-center gap-2"
                >
                  <PopArtHome className="w-3.5 h-3.5" />
                  <span>{isVi ? "Về trang chủ" : "Return to Home"}</span>
                </Link>
                <Link
                  href={`/${locale}/account/ratings`}
                  className="flex-1 px-5 py-2.5 bg-[#fef9c3] hover:bg-yellow-200 text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] text-center flex items-center justify-center gap-2"
                >
                  <span>{isVi ? "Xem đánh giá của tôi" : "My Reviews"}</span>
                  <PopArtArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-5">
              <div className="p-4 bg-[#fee2e2] border-2 border-black shadow-[3px_3px_0px_#000] flex items-start gap-3">
                <PopArtAlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs text-red-950 font-bold space-y-1">
                  <p className="font-black text-sm text-red-900">
                    {isVi ? "Không thể khôi phục tài khoản" : "Recovery Failed"}
                  </p>
                  <p className="leading-relaxed">{message}</p>
                </div>
              </div>

              <div className="p-4 bg-[#f8fafc] border border-black text-xs text-gray-700 leading-relaxed">
                {isVi
                  ? "Mã khôi phục có thể đã hết hạn (sau 14 ngày) hoặc đã được sử dụng trước đó. Nếu bạn cần hỗ trợ, vui lòng liên hệ admin qua email hoặc đăng ký tài khoản mới."
                  : "The recovery token may have expired (after 14 days) or was already used. Please contact our support team or register a new account via Google."}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setMessage("");
                  }}
                  className="px-5 py-2.5 bg-white hover:bg-gray-100 text-black font-bold text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  {isVi ? "Thử lại mã khác" : "Try Another Token"}
                </button>
                <Link
                  href={`/${locale}`}
                  className="px-5 py-2.5 bg-black text-white hover:bg-gray-800 font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] text-center"
                >
                  {isVi ? "Về trang chủ" : "Return to Home"}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccountRecoverPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8f9fa] py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-mono font-bold text-gray-500 uppercase">
            Đang chuẩn bị trang khôi phục...
          </p>
        </div>
      }
    >
      <AccountRecoverContent />
    </Suspense>
  );
}
