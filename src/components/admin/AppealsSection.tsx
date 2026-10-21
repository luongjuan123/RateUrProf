"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  Send,
  Eye,
  Check,
  X,
  UserCheck,
  UserX,
} from "lucide-react";

interface AdminAppealItem {
  id: string;
  userId?: string;
  user_id?: string;
  userEmail?: string;
  user_email?: string;
  userDisplayName?: string | null;
  user_display_name?: string | null;
  category: string;
  reason: string;
  supportingInfo?: string | null;
  supporting_info?: string | null;
  status: "pending" | "submitted" | "under_review" | "approved" | "accepted" | "rejected" | "closed";
  reviewerNotes?: string | null;
  adminNotes?: string | null;
  admin_notes?: string | null;
  decisionReason?: string | null;
  decision_reason?: string | null;
  reviewedBy?: string | null;
  reviewed_by?: string | null;
  reviewedAt?: number | null;
  reviewed_at?: number | null;
  createdAt?: number;
  created_at?: number;
  updatedAt?: number;
  updated_at?: number;
}

export function AppealsSection() {
  const [appeals, setAppeals] = useState<AdminAppealItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");

  // Review Modal State
  const [activeAppeal, setActiveAppeal] = useState<AdminAppealItem | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approved" | "rejected" | "under_review">("approved");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const getUserName = (a: AdminAppealItem | null) => {
    if (!a) return "Người dùng";
    return a.userDisplayName || a.user_display_name || a.userEmail || a.user_email || "Người dùng";
  };

  const getUserEmail = (a: AdminAppealItem | null) => {
    if (!a) return "";
    return a.userEmail || a.user_email || "";
  };

  const getCreatedAtTimestamp = (a: AdminAppealItem | null): number => {
    if (!a) return Date.now();
    const val = a.createdAt ?? a.created_at;
    if (typeof val === "number" && !isNaN(val)) return val;
    if (typeof val === "string") {
      const num = Number(val);
      if (!isNaN(num) && num > 1000000000) return num;
      const parsed = new Date(val).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return Date.now();
  };

  const formatDate = (a: AdminAppealItem) => {
    const ts = getCreatedAtTimestamp(a);
    return new Date(ts).toLocaleString("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const formatDateTime = (a: AdminAppealItem) => {
    const ts = getCreatedAtTimestamp(a);
    return new Date(ts).toLocaleString("vi-VN");
  };

  const getSupporting = (a: AdminAppealItem | null) => {
    if (!a) return null;
    return a.supportingInfo || a.supporting_info || null;
  };

  const getDecisionReason = (a: AdminAppealItem | null) => {
    if (!a) return "";
    return a.decisionReason || a.decision_reason || a.reviewerNotes || a.adminNotes || a.admin_notes || "";
  };

  const fetchAppeals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "15",
      });
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/admin/appeals?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAppeals(data.items || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Fetch appeals error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals]);

  const handleOpenReview = (appeal: AdminAppealItem) => {
    setActiveAppeal(appeal);
    setReviewDecision(appeal.status === "rejected" ? "rejected" : "approved");
    setReviewerNotes(getDecisionReason(appeal));
    setFeedback(null);
  };

  const handleCloseReview = () => {
    setActiveAppeal(null);
    setReviewerNotes("");
    setActionLoading(false);
  };

  const handleProcessAppeal = async () => {
    if (!activeAppeal) return;
    if (reviewDecision === "rejected" && !reviewerNotes.trim()) {
      setFeedback({
        type: "error",
        message: "Vui lòng nhập lý do từ chối kháng nghị để phản hồi qua email cho người dùng.",
      });
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    try {
      const actionParam =
        reviewDecision === "approved"
          ? "accept"
          : reviewDecision === "rejected"
          ? "reject"
          : "under_review";

      const res = await fetch("/api/admin/appeals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appealId: activeAppeal.id,
          action: actionParam,
          status: reviewDecision,
          decisionReason: reviewerNotes.trim() || undefined,
          reviewerNotes: reviewerNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.error || "Có lỗi xảy ra khi xử lý kháng nghị.",
        });
      } else {
        setFeedback({
          type: "success",
          message: data.message || "Xử lý kháng nghị thành công!",
        });
        setTimeout(() => {
          handleCloseReview();
          fetchAppeals();
        }, 1200);
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Không thể kết nối đến máy chủ quản trị.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "mistaken_lock":
        return "Khóa nhầm lẫn";
      case "resolved_violation":
        return "Đã khắc phục vi phạm";
      case "compromised_account":
        return "Tài khoản bị xâm phạm";
      default:
        return "Lý do khác";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
      case "submitted":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#fef9c3] text-black text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000]">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>Chờ duyệt</span>
          </span>
        );
      case "under_review":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e0f2fe] text-black text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000]">
            <RotateCw className="w-3 h-3 text-blue-700" />
            <span>Đang xem xét</span>
          </span>
        );
      case "approved":
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#dcfce7] text-green-950 text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000]">
            <CheckCircle2 className="w-3 h-3 text-green-700" />
            <span>Đã chấp thuận</span>
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#fee2e2] text-red-950 text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000]">
            <XCircle className="w-3 h-3 text-red-700" />
            <span>Đã từ chối</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-[10px] font-black uppercase border border-black">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metric */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-black p-5 shadow-[4px_4px_0px_#000]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#fee2e2] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-[#e03a3e]" strokeWidth={2.2} />
          </div>
          <div>
            <span className="px-2 py-0.5 bg-[#fef9c3] text-black text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000]">
              TRUNG TÂM DUYỆT KHÁNG NGHỊ
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mt-1">
              Kháng nghị Khóa Tài khoản ({totalCount})
            </h1>
          </div>
        </div>

        <button
          onClick={() => fetchAppeals()}
          className="self-start sm:self-center px-4 py-2 bg-white hover:bg-gray-100 text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-white border-2 border-black p-3 shadow-[3px_3px_0px_#000]">
        <Filter className="w-4 h-4 text-black shrink-0 ml-1" />
        <span className="text-xs font-black uppercase tracking-wider text-black">
          Lọc trạng thái:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: "all", label: "Tất cả" },
            { id: "pending", label: "Chờ duyệt" },
            { id: "under_review", label: "Đang xem xét" },
            { id: "approved", label: "Đã chấp thuận" },
            { id: "rejected", label: "Đã từ chối" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setStatusFilter(item.id);
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border border-black transition-all cursor-pointer ${
                statusFilter === item.id
                  ? "bg-black text-white shadow-[2px_2px_0px_#000] font-black"
                  : "bg-white text-gray-800 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0px_#000] overflow-hidden">
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-mono font-bold text-gray-500 uppercase">
              Đang tải danh sách kháng nghị...
            </p>
          </div>
        ) : appeals.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileText className="w-10 h-10 text-gray-400 mx-auto" />
            <p className="text-sm font-bold text-gray-700">
              Không có đơn kháng nghị nào phù hợp bộ lọc.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f8fafc] border-b-2 border-black text-gray-900 uppercase font-black tracking-wider">
                <tr>
                  <th className="p-3 border-r border-gray-200">Người dùng</th>
                  <th className="p-3 border-r border-gray-200">Phân loại</th>
                  <th className="p-3 border-r border-gray-200">Lý do kháng nghị</th>
                  <th className="p-3 border-r border-gray-200">Thời gian gửi</th>
                  <th className="p-3 border-r border-gray-200">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y border-gray-200">
                {appeals.map((appeal) => (
                  <tr key={appeal.id} className="hover:bg-yellow-50/50 transition-colors">
                    <td className="p-3 border-r border-gray-200 max-w-[200px]">
                      <div className="font-bold text-gray-900 truncate" title={getUserName(appeal)}>
                        {getUserName(appeal)}
                      </div>
                      <div className="font-mono text-[11px] text-gray-500 truncate" title={getUserEmail(appeal)}>
                        {getUserEmail(appeal)}
                      </div>
                    </td>
                    <td className="p-3 border-r border-gray-200 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-gray-100 border border-black text-[10px] font-bold uppercase">
                        {getCategoryLabel(appeal.category)}
                      </span>
                    </td>
                    <td className="p-3 border-r border-gray-200 max-w-[280px]">
                      <p className="line-clamp-2 text-gray-800 font-medium leading-relaxed">
                        {appeal.reason}
                      </p>
                      {getSupporting(appeal) && (
                        <span className="text-[10px] text-gray-500 font-mono block truncate mt-0.5">
                          Tài liệu: {getSupporting(appeal)}
                        </span>
                      )}
                    </td>
                    <td className="p-3 border-r border-gray-200 whitespace-nowrap font-mono text-[11px] text-gray-600 font-bold">
                      {formatDate(appeal)}
                    </td>
                    <td className="p-3 border-r border-gray-200 whitespace-nowrap">
                      {getStatusBadge(appeal.status)}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenReview(appeal)}
                        className="px-3 py-1.5 bg-[#fef9c3] hover:bg-yellow-200 text-black font-black text-[11px] uppercase tracking-wider border border-black shadow-[1.5px_1.5px_0px_#000] active:translate-x-[0.5px] active:translate-y-[0.5px] cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Xem &amp; Xử lý</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t-2 border-black bg-[#f8fafc]">
            <span className="text-xs font-mono font-bold text-gray-600">
              Trang {page} / {totalPages} ({totalCount} kháng nghị)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 bg-white hover:bg-gray-100 disabled:opacity-40 border border-black shadow-[1px_1px_0px_#000] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-black" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 bg-white hover:bg-gray-100 disabled:opacity-40 border border-black shadow-[1px_1px_0px_#000] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review & Resolution Modal */}
      {activeAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white border-2 border-black shadow-[6px_6px_0px_#000] w-full max-w-xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#e03a3e] text-white text-[10px] font-black uppercase tracking-wider border border-black shadow-[1px_1px_0px_#000]">
                  QUẢN TRỊ KHÁNG NGHỊ
                </span>
                <span className="text-xs font-mono font-bold text-gray-500">
                  ID: {activeAppeal.id}
                </span>
              </div>
              <button
                disabled={actionLoading}
                onClick={handleCloseReview}
                className="p-1 hover:bg-gray-100 border border-black shadow-[1px_1px_0px_#000] cursor-pointer"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* User Meta Card */}
            <div className="p-3.5 bg-[#f8fafc] border border-black space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-gray-900 text-sm">
                  {getUserName(activeAppeal)}
                </span>
                <span className="font-mono text-gray-600 font-bold">
                  {getUserEmail(activeAppeal)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500 font-mono">
                <span>Phân loại: {getCategoryLabel(activeAppeal.category)}</span>
                <span>
                  Gửi ngày: {formatDateTime(activeAppeal)}
                </span>
              </div>
            </div>

            {/* Submitted Appeal Detail */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-900">
                Nội dung kháng nghị từ người dùng:
              </label>
              <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-medium text-gray-900 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                {activeAppeal.reason}
              </div>
              {getSupporting(activeAppeal) && (
                <div className="text-[11px] text-gray-600 font-mono pt-1">
                  <span className="font-bold">Tài liệu đính kèm: </span>
                  <span className="break-all">{getSupporting(activeAppeal)}</span>
                </div>
              )}
            </div>

            {/* Decision Radio Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-900">
                Quyết định xử lý:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewDecision("approved")}
                  className={`p-2.5 border-2 border-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    reviewDecision === "approved"
                      ? "bg-[#dcfce7] shadow-[2px_2px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                      : "bg-white hover:bg-gray-100"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-green-700" />
                  <span>Chấp thuận &amp; Mở khóa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewDecision("rejected")}
                  className={`p-2.5 border-2 border-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    reviewDecision === "rejected"
                      ? "bg-[#fee2e2] shadow-[2px_2px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                      : "bg-white hover:bg-gray-100"
                  }`}
                >
                  <UserX className="w-3.5 h-3.5 text-red-700" />
                  <span>Từ chối kháng nghị</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewDecision("under_review")}
                  className={`p-2.5 border-2 border-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    reviewDecision === "under_review"
                      ? "bg-[#e0f2fe] shadow-[2px_2px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                      : "bg-white hover:bg-gray-100"
                  }`}
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-700" />
                  <span>Đang xem xét</span>
                </button>
              </div>
            </div>

            {/* Reviewer Note Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-900">
                Ghi chú / Lý do phản hồi qua email cho người dùng:
                {reviewDecision === "rejected" && <span className="text-[#e03a3e] ml-1">* (Bắt buộc khi từ chối)</span>}
              </label>
              <textarea
                rows={3}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder={
                  reviewDecision === "approved"
                    ? "Ghi chú gửi kèm email xác nhận mở khóa tài khoản (ví dụ: Chào bạn, kháng nghị của bạn đã được chấp thuận...)"
                    : "Lý do từ chối kháng nghị gửi vào email người dùng (ví dụ: Chưa đủ căn cứ xác thực, vi phạm nghiêm trọng...)"
                }
                className="w-full px-3 py-2 text-xs font-medium border-2 border-black bg-white rounded-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-[2px_2px_0px_#000] resize-none"
              />
            </div>

            {/* Feedback alert */}
            {feedback && (
              <div
                className={`p-3 border-2 border-black text-xs font-bold shadow-[2px_2px_0px_#000] ${
                  feedback.type === "success"
                    ? "bg-[#dcfce7] text-green-950"
                    : "bg-[#fee2e2] text-red-950"
                }`}
              >
                {feedback.message}
              </div>
            )}

            {/* Bottom Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCloseReview}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-black font-bold text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleProcessAppeal}
                className={`px-5 py-2 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer ${
                  reviewDecision === "approved"
                    ? "bg-green-700 hover:bg-green-800"
                    : reviewDecision === "rejected"
                    ? "bg-[#e03a3e] hover:bg-[#c92f33]"
                    : "bg-blue-700 hover:bg-blue-800"
                }`}
              >
                {actionLoading ? "Đang xử lý & gửi email..." : "Xác nhận & Cập nhật"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
