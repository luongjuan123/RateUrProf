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
    <div className="min-h-screen bg-[#f8f9fa] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Main Status Header Card */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_#000] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-black pb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-[#fee2e2] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center shrink-0">
                <PopArtLock className="w-7 h-7" />
              </div>
              <div>
                <div className="inline-block px-2.5 py-0.5 bg-[#e03a3e] text-white text-[10px] font-black uppercase tracking-wider border border-black shadow-[1.5px_1.5px_0px_#000] mb-2">
                  {isVi ? "TRẠNG THÁI: TÀI KHOẢN BỊ KHÓA" : "STATUS: ACCOUNT LOCKED"}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {isVi ? "Tài khoản của bạn đã bị khóa" : "Your Account Has Been Locked"}
                </h1>
                <p className="text-xs font-mono font-bold text-gray-500 mt-1">
                  {user?.email || "user@rateurprofs.site"}
                  {lockedDateStr && ` • ${isVi ? "Khóa lúc" : "Locked on"}: ${lockedDateStr}`}
                </p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="self-start px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <PopArtLogOut className="w-3.5 h-3.5" />
              <span>{isVi ? "Đăng xuất" : "Sign Out"}</span>
            </button>
          </div>

          {/* Explanation Banner */}
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-[#fef9c3] border-2 border-black shadow-[3px_3px_0px_#000]">
              <div className="flex items-center gap-2 mb-1">
                <PopArtAlertTriangle className="w-4 h-4 shrink-0" />
                <h3 className="text-xs font-black uppercase tracking-wider text-black">
                  {isVi ? "Lý do khóa tài khoản từ Ban Quản Trị" : "Lock Reason from Administration"}
                </h3>
              </div>
              <p className="text-sm font-bold text-gray-900 leading-relaxed pl-6">
                &ldquo;{lockReason}&rdquo;
              </p>
            </div>

            <div className="p-4 bg-[#f1f5f9] border border-black text-xs text-gray-700 leading-relaxed space-y-2">
              <p className="font-bold text-black flex items-center gap-1.5">
                <PopArtShieldAlert className="w-4 h-4" />
                {isVi ? "Những tính năng bị vô hiệu hóa:" : "Disabled Features:"}
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-gray-800">
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
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_#000] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b-2 border-black pb-4">
            <div className="flex items-center gap-2.5">
              <PopArtFileText className="w-5 h-5" />
              <h2 className="text-lg font-black uppercase tracking-wider text-black">
                {isVi ? "Trung tâm Kháng nghị" : "Appeals Center"}
              </h2>
            </div>
            <button
              onClick={() => {
                fetchAppeal();
                refreshUser();
              }}
              title={isVi ? "Làm mới dữ liệu" : "Refresh status"}
              className="p-1.5 border border-black bg-white hover:bg-gray-100 shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-black" />
            </button>
          </div>

          {submitSuccess && (
            <div className="p-4 bg-[#dcfce7] border-2 border-black shadow-[3px_3px_0px_#000] flex items-start gap-3">
              <PopArtCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs text-green-950 font-bold space-y-1">
                <p className="font-black text-sm text-green-900">
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
              <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-mono font-bold text-gray-500 uppercase">
                {isVi ? "Đang tải thông tin kháng nghị..." : "Checking existing appeals..."}
              </p>
            </div>
          ) : existingAppeal && (existingAppeal.status === "pending" || existingAppeal.status === "submitted" || existingAppeal.status === "under_review") ? (
            /* Active Appeal In Progress */
            <div className="p-5 bg-[#fef9c3] border-2 border-black shadow-[3px_3px_0px_#000] space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-black text-[#facc15] text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000]">
                  {existingAppeal.status === "under_review"
                    ? isVi
                      ? "ĐANG XEM XÉT"
                      : "UNDER REVIEW"
                    : isVi
                    ? "ĐANG CHỜ DUYỆT"
                    : "PENDING REVIEW"}
                </span>
                <span className="text-[11px] font-mono text-gray-700 flex items-center gap-1 font-bold">
                  <PopArtClock className="w-3.5 h-3.5" />
                  {new Date(existingAppeal.createdAt || existingAppeal.created_at || Date.now()).toLocaleDateString(isVi ? "vi-VN" : "en-US", {
                    dateStyle: "medium",
                  })}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider">
                  {isVi ? "Nội dung bạn đã gửi:" : "Submitted Appeal:"}
                </h4>
                <p className="text-xs text-gray-800 bg-white/70 p-3 border border-black mt-1.5 font-medium leading-relaxed">
                  {existingAppeal.reason}
                </p>
              </div>

              {(existingAppeal.supportingInfo || existingAppeal.supporting_info) && (
                <p className="text-[11px] text-gray-600 font-mono">
                  <span className="font-bold">{isVi ? "Tài liệu kèm theo: " : "Supporting info: "}</span>
                  {existingAppeal.supportingInfo || existingAppeal.supporting_info}
                </p>
              )}

              <p className="text-xs text-gray-700 font-semibold italic pt-1">
                {isVi
                  ? "Kháng nghị của bạn đang được điều tra viên xem xét. Khi có quyết định, bạn sẽ nhận được thông báo qua email."
                  : "Your appeal is currently being reviewed by the moderation team. You will be notified by email upon decision."}
              </p>
            </div>
          ) : existingAppeal && (existingAppeal.status === "accepted" || existingAppeal.status === "approved") ? (
            /* Accepted Appeal Notice */
            <div className="p-5 bg-[#dcfce7] border-2 border-black shadow-[3px_3px_0px_#000] space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-green-800 text-white text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000]">
                  {isVi ? "KHÁNG NGHỊ ĐÃ ĐƯỢC CHẤP THUẬN" : "APPEAL APPROVED"}
                </span>
                {(existingAppeal.reviewedAt || existingAppeal.reviewed_at) && (
                  <span className="text-[11px] font-mono text-gray-700 font-bold">
                    {new Date(existingAppeal.reviewedAt || existingAppeal.reviewed_at || Date.now()).toLocaleDateString(isVi ? "vi-VN" : "en-US")}
                  </span>
                )}
              </div>

              <div className="bg-white p-3 border border-black space-y-1">
                <p className="text-[11px] font-black uppercase text-green-800">
                  {isVi ? "Quyết định từ Ban Quản Trị:" : "Moderation Decision:"}
                </p>
                <p className="text-xs text-gray-900 font-bold leading-relaxed">
                  &ldquo;{existingAppeal.reviewerNotes || existingAppeal.decision_reason || existingAppeal.decisionReason || (isVi ? "Kháng nghị của bạn đã được duyệt và tài khoản đã được mở khóa." : "Your appeal has been accepted and your account is unlocked.")}&rdquo;
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <Link
                  href={`/${locale}`}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                >
                  {isVi ? "Quay lại trang chủ" : "Return to Homepage"}
                </Link>
              </div>
            </div>
          ) : existingAppeal && existingAppeal.status === "rejected" && !showAppealForm ? (
            /* Rejected Appeal Notice with option to re-appeal */
            <div className="p-5 bg-[#fee2e2] border-2 border-black shadow-[3px_3px_0px_#000] space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-[#e03a3e] text-white text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000]">
                  {isVi ? "KHÁNG NGHỊ BỊ TỪ CHỐI" : "APPEAL REJECTED"}
                </span>
                {(existingAppeal.reviewedAt || existingAppeal.reviewed_at) && (
                  <span className="text-[11px] font-mono text-gray-700 font-bold">
                    {new Date(existingAppeal.reviewedAt || existingAppeal.reviewed_at || Date.now()).toLocaleDateString(isVi ? "vi-VN" : "en-US")}
                  </span>
                )}
              </div>

              {(existingAppeal.reviewerNotes || existingAppeal.decision_reason || existingAppeal.decisionReason) && (
                <div className="bg-white p-3 border border-black space-y-1">
                  <p className="text-[11px] font-black uppercase text-[#e03a3e]">
                    {isVi ? "Phản hồi từ Ban Quản Trị:" : "Moderation Decision Notes:"}
                  </p>
                  <p className="text-xs text-gray-900 font-bold leading-relaxed">
                    &ldquo;{existingAppeal.reviewerNotes || existingAppeal.decision_reason || existingAppeal.decisionReason}&rdquo;
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <p className="text-xs text-gray-700 font-medium">
                  {isVi
                    ? "Nếu bạn có thêm thông tin xác thực mới, bạn có thể gửi lại kháng nghị."
                    : "If you have new verifiable context, you may submit a re-appeal."}
                </p>
                <button
                  onClick={() => setShowAppealForm(true)}
                  className="px-4 py-2 bg-white hover:bg-gray-100 text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer shrink-0"
                >
                  {isVi ? "Gửi kháng nghị mới" : "Submit New Appeal"}
                </button>
              </div>
            </div>
          ) : !showAppealForm ? (
            /* Call to Action to open appeal form */
            <div className="p-6 bg-[#f8fafc] border-2 border-black border-dashed text-center space-y-3">
              <PopArtHelpCircle className="w-8 h-8 mx-auto" />
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
                {isVi ? "Bạn cho rằng việc khóa tài khoản là nhầm lẫn?" : "Believe this was a mistake?"}
              </h3>
              <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                {isVi
                  ? "Hãy gửi kháng nghị để đội ngũ kiểm duyệt xem xét lại quyết định. Vui lòng cung cấp giải trình rõ ràng và các thông tin liên quan."
                  : "Submit an appeal to request a moderation re-evaluation. Please provide clear context and any supporting details."}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setShowAppealForm(true)}
                  className="px-6 py-2.5 bg-[#e03a3e] hover:bg-[#c92f33] text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all inline-flex items-center gap-2 cursor-pointer"
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
                <label className="block text-xs font-black uppercase tracking-wider text-gray-900">
                  {isVi ? "1. Phân loại kháng nghị" : "1. Appeal Category"}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold border-2 border-black bg-white rounded-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-[2px_2px_0px_#000] cursor-pointer"
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
                <label className="block text-xs font-black uppercase tracking-wider text-gray-900">
                  {isVi ? "2. Lý do & Giải trình chi tiết" : "2. Detailed Explanation & Context"}
                  <span className="text-[#e03a3e] ml-1">*</span>
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
                  className="w-full px-3.5 py-2.5 text-xs font-medium border-2 border-black bg-white rounded-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-[2px_2px_0px_#000] focus:shadow-[4px_4px_0px_#000] transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-900">
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
                  className="w-full px-3.5 py-2.5 text-xs font-medium border-2 border-black bg-white rounded-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-[2px_2px_0px_#000] transition-all"
                />
              </div>

              {submitError && (
                <div className="p-3 bg-[#fee2e2] border-2 border-black text-xs font-bold text-red-900 shadow-[2px_2px_0px_#000]">
                  {submitError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#e03a3e] hover:bg-[#c92f33] disabled:bg-gray-400 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center gap-2 cursor-pointer"
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
                  className="px-5 py-2.5 bg-white hover:bg-gray-100 text-black font-bold text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                >
                  {isVi ? "Hủy" : "Cancel"}
                </button>
              </div>
            </form>
          )}

          {/* Footer Guidelines Link */}
          <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-600 gap-2">
            <span>
              {isVi ? "Cần tìm hiểu tiêu chuẩn đánh giá?" : "Need to review our review standards?"}
            </span>
            <Link
              href={`/${locale}/guidelines`}
              className="font-bold text-black hover:text-[#e03a3e] underline decoration-2 decoration-black hover:decoration-[#e03a3e] transition-colors"
            >
              {isVi ? "Xem Hướng dẫn & Quy định cộng đồng →" : "Read Community Guidelines →"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
