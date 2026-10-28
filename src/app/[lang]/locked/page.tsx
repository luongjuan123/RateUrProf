"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/locales/i18n";
import { RefreshCw } from "lucide-react";
import {
  PopArtLock,
  PopArtAlertTriangle,
  PopArtSend,
  PopArtLogOut,
  PopArtCheck,
  PopArtClock,
  PopArtShieldAlert,
  PopArtHelpCircle,
  PopArtFileText,
} from "@/components/icons/PopArtIcons";

interface AppealRecord {
  id: string;
  status: "pending" | "submitted" | "under_review" | "approved" | "accepted" | "rejected" | "closed";
  category: string;
  reason: string;
  supportingInfo?: string | null;
  supporting_info?: string | null;
  reviewerNotes?: string | null;
  decisionReason?: string | null;
  decision_reason?: string | null;
  createdAt?: number;
  created_at?: number;
  reviewedAt?: number | null;
  reviewed_at?: number | null;
}

export default function LockedAccountPage() {
  const { user, logOut, refreshUser } = useAuth();
  const { locale } = useTranslation();
  const router = useRouter();
  const isVi = locale === "vi";

  const [existingAppeal, setExistingAppeal] = useState<AppealRecord | null>(null);
  const [loadingAppeal, setLoadingAppeal] = useState(true);
  const [showAppealForm, setShowAppealForm] = useState(false);

  // Form states
  const [category, setCategory] = useState("mistaken_lock");
  const [reason, setReason] = useState("");
  const [supportingInfo, setSupportingInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchAppeal = useCallback(async () => {
    setLoadingAppeal(true);
    try {
      const res = await fetch("/api/account/appeal", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setExistingAppeal(data.appeal || null);
        if (
          data.appeal &&
          (data.appeal.status === "pending" ||
            data.appeal.status === "submitted" ||
            data.appeal.status === "under_review")
        ) {
          setShowAppealForm(false);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch appeal status:", err);
    } finally {
      setLoadingAppeal(false);
    }
  }, []);

  useEffect(() => {
    fetchAppeal();
  }, [fetchAppeal]);

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 10) {
      setSubmitError(
        isVi
          ? "Vui lòng nhập lý do kháng nghị chi tiết hơn (tối thiểu 10 ký tự)."
          : "Please provide a more detailed appeal reason (at least 10 characters)."
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/account/appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          reason: reason.trim(),
          supportingInfo: supportingInfo.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || (isVi ? "Có lỗi xảy ra khi gửi kháng nghị." : "Failed to submit appeal."));
        return;
      }

      setSubmitSuccess(true);
      setShowAppealForm(false);
      await fetchAppeal();
    } catch {
      setSubmitError(isVi ? "Không thể kết nối máy chủ." : "Could not reach server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await logOut();
    router.push(`/${locale}`);
  };

  const lockReason =
    user?.lockReason ||
    (isVi
      ? "Tài khoản bị tạm khóa do vi phạm Tiêu chuẩn Cộng đồng hoặc hoạt động đáng ngờ."
      : "Account suspended due to Community Guidelines violations or suspicious activity.");

  const lockedDateStr = user?.lockedAt
    ? new Date(user.lockedAt).toLocaleString(isVi ? "vi-VN" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Main Status Header Card */}
        <div className="bg-white border border-gray-200 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gray-200 pb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-50 border border-blue-200 text-[#1d4ed8] flex items-center justify-center shrink-0">
                <PopArtLock className="w-7 h-7" />
              </div>
              <div>
                <div className="inline-block px-2.5 py-0.5 bg-[#1d4ed8] text-white text-[10px] font-bold uppercase tracking-wider mb-2">
                  {isVi ? "TRẠNG THÁI: TÀI KHOẢN BỊ KHÓA" : "STATUS: ACCOUNT LOCKED"}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {isVi ? "Tài khoản của bạn đã bị khóa" : "Your Account Has Been Locked"}
                </h1>
                <p className="text-xs font-mono font-bold text-slate-500 mt-1">
                  {user?.email || "user@rateurprofs.site"}
                  {lockedDateStr && ` • ${isVi ? "Khóa lúc" : "Locked on"}: ${lockedDateStr}`}
                </p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="self-start px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider border border-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <PopArtLogOut className="w-3.5 h-3.5" />
              <span>{isVi ? "Đăng xuất" : "Sign Out"}</span>
            </button>
          </div>

          {/* Explanation Banner */}
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <PopArtAlertTriangle className="w-4 h-4 shrink-0 text-[#1d4ed8]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1d4ed8]">
                  {isVi ? "Lý do khóa tài khoản từ Ban Quản Trị" : "Lock Reason from Administration"}
                </h3>
              </div>
              <p className="text-sm font-medium text-slate-800 leading-relaxed pl-6">
                &ldquo;{lockReason}&rdquo;
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <PopArtShieldAlert className="w-4 h-4 text-[#1d4ed8]" />
                {isVi ? "Những tính năng bị vô hiệu hóa:" : "Disabled Features:"}
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
                <li>
                  {isVi
                    ? "Không thể gửi đánh giá mới cho giảng viên hoặc trường đại học."
                    : "Cannot submit new reviews for professors or universities."}
                </li>
                <li>
                  {isVi
                    ? "Không thể upvote, tương tác hoặc lưu giảng viên vào danh sách."
                    : "Cannot upvote, react, or bookmark professors."}
                </li>
                <li>
                  {isVi
                    ? "Không thể cập nhật hồ sơ cá nhân hoặc bình luận trên trang."
                    : "Cannot update profile or post comments on the platform."}
                </li>
                <li>
                  {isVi
                    ? "Các đánh giá trước đây của bạn tạm thời được ẩn khỏi bảng xếp hạng công khai."
                    : "Your prior reviews have been temporarily hidden from public rankings."}
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Appeal Section */}
        <div className="bg-white border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div className="flex items-center gap-2.5">
              <PopArtFileText className="w-5 h-5 text-[#1d4ed8]" />
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">
                {isVi ? "Trung tâm Kháng nghị" : "Appeals Center"}
              </h2>
            </div>
            <button
              onClick={() => {
                fetchAppeal();
                refreshUser();
              }}
              title={isVi ? "Làm mới dữ liệu" : "Refresh status"}
              className="p-1.5 border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {submitSuccess && (
            <div className="p-4 bg-blue-50 border border-blue-200 flex items-start gap-3">
              <PopArtCheck className="w-5 h-5 shrink-0 mt-0.5 text-[#1d4ed8]" />
              <div className="text-xs text-blue-950 font-medium space-y-1">
                <p className="font-bold text-sm text-[#1d4ed8]">
                  {isVi ? "Đã gửi kháng nghị thành công!" : "Appeal Submitted Successfully!"}
                </p>
                <p>
                  {isVi
                    ? "Chúng tôi đã gửi email xác nhận đến hộp thư của bạn. Ban Quản Trị sẽ xem xét và phản hồi trong thời gian sớm nhất."
                    : "A confirmation email has been dispatched to your inbox. The moderation team will review and reply soon."}
                </p>
              </div>
            </div>
          )}

          {loadingAppeal ? (
            <div className="text-center py-8 space-y-2">
              <div className="w-6 h-6 border-2 border-[#1d4ed8] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-mono font-bold text-slate-500 uppercase">
                {isVi ? "Đang tải thông tin kháng nghị..." : "Checking existing appeals..."}
              </p>
            </div>
          ) : existingAppeal && (existingAppeal.status === "pending" || existingAppeal.status === "submitted" || existingAppeal.status === "under_review") ? (
            /* Active Appeal In Progress */
            <div className="p-5 bg-blue-50/50 border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-[#1d4ed8] text-white text-[10px] font-bold uppercase tracking-wider">
                  {existingAppeal.status === "under_review"
                    ? isVi
                      ? "ĐANG XEM XÉT"
                      : "UNDER REVIEW"
                    : isVi
                    ? "ĐANG CHỜ DUYỆT"
                    : "PENDING REVIEW"}
                </span>
                <span className="text-[11px] font-mono text-slate-600 flex items-center gap-1 font-bold">
                  <PopArtClock className="w-3.5 h-3.5 text-[#1d4ed8]" />
                  {new Date(existingAppeal.createdAt || existingAppeal.created_at || Date.now()).toLocaleDateString(isVi ? "vi-VN" : "en-US", {
                    dateStyle: "medium",
                  })}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-900 tracking-wider">
                  {isVi ? "Nội dung bạn đã gửi:" : "Submitted Appeal:"}
                </h4>
                <p className="text-xs text-slate-800 bg-white p-3 border border-blue-200 mt-1.5 font-medium leading-relaxed">
                  {existingAppeal.reason}
                </p>
              </div>

              {(existingAppeal.supportingInfo || existingAppeal.supporting_info) && (
                <p className="text-[11px] text-slate-600 font-mono">
                  <span className="font-bold">{isVi ? "Tài liệu kèm theo: " : "Supporting info: "}</span>
                  {existingAppeal.supportingInfo || existingAppeal.supporting_info}
                </p>
              )}

              <p className="text-xs text-slate-600 font-medium italic pt-1">
                {isVi
                  ? "Kháng nghị của bạn đang được điều tra viên xem xét. Khi có quyết định, bạn sẽ nhận được thông báo qua email."
                  : "Your appeal is currently being reviewed by the moderation team. You will be notified by email upon decision."}
              </p>
            </div>
          ) : existingAppeal && (existingAppeal.status === "accepted" || existingAppeal.status === "approved") ? (
            /* Accepted Appeal Notice */
            <div className="p-5 bg-blue-50 border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-[#1d4ed8] text-white text-[10px] font-bold uppercase tracking-wider">
                  {isVi ? "KHÁNG NGHỊ ĐÃ ĐƯỢC CHẤP THUẬN" : "APPEAL APPROVED"}
                </span>
                {(existingAppeal.reviewedAt || existingAppeal.reviewed_at) && (
                  <span className="text-[11px] font-mono text-slate-600 font-bold">
                    {new Date(existingAppeal.reviewedAt || existingAppeal.reviewed_at || Date.now()).toLocaleDateString(isVi ? "vi-VN" : "en-US")}
                  </span>
                )}
              </div>

              <div className="bg-white p-3 border border-blue-200 space-y-1">
                <p className="text-[11px] font-bold uppercase text-[#1d4ed8]">
                  {isVi ? "Quyết định từ Ban Quản Trị:" : "Moderation Decision:"}
                </p>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  &ldquo;{existingAppeal.reviewerNotes || existingAppeal.decision_reason || existingAppeal.decisionReason || (isVi ? "Kháng nghị của bạn đã được duyệt và tài khoản đã được mở khóa." : "Your appeal has been accepted and your account is unlocked.")}&rdquo;
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <Link
                  href={`/${locale}`}
                  className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {isVi ? "Quay lại trang chủ" : "Return to Homepage"}
                </Link>
              </div>
            </div>
          ) : existingAppeal && existingAppeal.status === "rejected" && !showAppealForm ? (
            /* Rejected Appeal Notice with option to re-appeal */
            <div className="p-5 bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wider">
                  {isVi ? "KHÁNG NGHỊ BỊ TỪ CHỐI" : "APPEAL REJECTED"}
                </span>
                {(existingAppeal.reviewedAt || existingAppeal.reviewed_at) && (
                  <span className="text-[11px] font-mono text-slate-600 font-bold">
                    {new Date(existingAppeal.reviewedAt || existingAppeal.reviewed_at || Date.now()).toLocaleDateString(isVi ? "vi-VN" : "en-US")}
                  </span>
                )}
              </div>

              {(existingAppeal.reviewerNotes || existingAppeal.decision_reason || existingAppeal.decisionReason) && (
                <div className="bg-white p-3 border border-slate-200 space-y-1">
                  <p className="text-[11px] font-bold uppercase text-slate-700">
                    {isVi ? "Phản hồi từ Ban Quản Trị:" : "Moderation Decision Notes:"}
                  </p>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed">
                    &ldquo;{existingAppeal.reviewerNotes || existingAppeal.decision_reason || existingAppeal.decisionReason}&rdquo;
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <p className="text-xs text-slate-600 font-medium">
                  {isVi
                    ? "Nếu bạn có thêm thông tin xác thực mới, bạn có thể gửi lại kháng nghị."
                    : "If you have new verifiable context, you may submit a re-appeal."}
                </p>
                <button
                  onClick={() => setShowAppealForm(true)}
                  className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                >
                  {isVi ? "Gửi kháng nghị mới" : "Submit New Appeal"}
                </button>
              </div>
            </div>
          ) : !showAppealForm ? (
            /* Call to Action to open appeal form */
            <div className="p-6 bg-slate-50 border border-dashed border-gray-300 text-center space-y-3">
              <PopArtHelpCircle className="w-8 h-8 mx-auto text-[#1d4ed8]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                {isVi ? "Bạn cho rằng việc khóa tài khoản là nhầm lẫn?" : "Believe this was a mistake?"}
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {isVi
                  ? "Hãy gửi kháng nghị để đội ngũ kiểm duyệt xem xét lại quyết định. Vui lòng cung cấp giải trình rõ ràng và các thông tin liên quan."
                  : "Submit an appeal to request a moderation re-evaluation. Please provide clear context and any supporting details."}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setShowAppealForm(true)}
                  className="px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <PopArtSend className="w-3.5 h-3.5" />
                  <span>{isVi ? "Tạo đơn kháng nghị" : "Submit An Appeal"}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Appeal Form */
            <form onSubmit={handleSubmitAppeal} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                  {isVi ? "1. Phân loại kháng nghị" : "1. Appeal Category"}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium border border-gray-300 focus:border-[#1d4ed8] bg-white rounded-none outline-none focus:ring-1 focus:ring-[#1d4ed8] cursor-pointer"
                >
                  <option value="mistaken_lock">
                    {isVi ? "Khóa nhầm lẫn / Không vi phạm" : "Mistaken suspension / No violation"}
                  </option>
                  <option value="resolved_violation">
                    {isVi ? "Đã hiểu và cam kết tuân thủ quy định" : "Resolved issue / Commitment to guidelines"}
                  </option>
                  <option value="compromised_account">
                    {isVi ? "Tài khoản bị xâm phạm / Sử dụng trái phép" : "Compromised account / Unauthorized access"}
                  </option>
                  <option value="other">{isVi ? "Lý do khác" : "Other reason"}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                  {isVi ? "2. Lý do & Giải trình chi tiết" : "2. Detailed Explanation & Context"}
                  <span className="text-[#1d4ed8] ml-1">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    isVi
                      ? "Giải thích rõ ràng lý do bạn kháng nghị và những thông tin cần ban quản trị kiểm tra lại..."
                      : "Explain clearly why you are appealing and what details the moderation team should verify..."
                  }
                  className="w-full px-3.5 py-2.5 text-xs font-medium border border-gray-300 focus:border-[#1d4ed8] bg-white rounded-none outline-none focus:ring-1 focus:ring-[#1d4ed8] transition-colors resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                  {isVi ? "3. Bằng chứng hoặc tài liệu hỗ trợ (Không bắt buộc)" : "3. Supporting Links or Evidence (Optional)"}
                </label>
                <input
                  type="text"
                  value={supportingInfo}
                  onChange={(e) => setSupportingInfo(e.target.value)}
                  placeholder={
                    isVi
                      ? "Liên kết minh chứng, mã sinh viên hoặc thông tin bổ sung (nếu có)..."
                      : "Links, student proof, or supplementary notes (if any)..."
                  }
                  className="w-full px-3.5 py-2.5 text-xs font-medium border border-gray-300 focus:border-[#1d4ed8] bg-white rounded-none outline-none focus:ring-1 focus:ring-[#1d4ed8] transition-colors"
                />
              </div>

              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {submitError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] disabled:bg-gray-300 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <PopArtSend className="w-3.5 h-3.5" />
                  <span>
                    {submitting
                      ? isVi
                        ? "Đang gửi..."
                        : "Submitting..."
                      : isVi
                      ? "Gửi kháng nghị ngay"
                      : "Submit Appeal"}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowAppealForm(false)}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider border border-gray-200 transition-colors cursor-pointer"
                >
                  {isVi ? "Hủy" : "Cancel"}
                </button>
              </div>
            </form>
          )}

          {/* Footer Guidelines Link */}
          <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
            <span>
              {isVi ? "Cần tìm hiểu tiêu chuẩn đánh giá?" : "Need to review our review standards?"}
            </span>
            <Link
              href={`/${locale}/guidelines`}
              className="font-bold text-[#1d4ed8] hover:text-[#1e40af] hover:underline transition-colors"
            >
              {isVi ? "Xem Hướng dẫn & Quy định cộng đồng →" : "Read Community Guidelines →"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
