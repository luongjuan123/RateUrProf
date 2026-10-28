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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-[#1d4ed8] text-[10px] font-bold uppercase tracking-wider border border-blue-200">
            <Clock className="w-3 h-3 text-[#1d4ed8]" />
            <span>Chờ duyệt</span>
          </span>
        );
      case "under_review":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-[#1d4ed8] text-[10px] font-bold uppercase tracking-wider border border-blue-200">
            <RotateCw className="w-3 h-3 text-[#1d4ed8]" />
            <span>Đang xem xét</span>
          </span>
        );
      case "approved":
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-[#1d4ed8] text-[10px] font-bold uppercase tracking-wider border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-[#1d4ed8]" />
            <span>Đã chấp thuận</span>
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-600" />
            <span>Đã từ chối</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-50 text-slate-700 text-[10px] font-bold uppercase border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metric */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200 p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-50 border border-blue-200 text-[#1d4ed8] flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-[#1d4ed8]" strokeWidth={2.2} />
          </div>
          <div>
            <span className="px-2 py-0.5 bg-[#1d4ed8] text-white text-[10px] font-bold uppercase tracking-wider">
              TRUNG TÂM DUYỆT KHÁNG NGHỊ
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Kháng nghị Khóa Tài khoản ({totalCount})
            </h1>
          </div>
        </div>

        <button
          onClick={() => fetchAppeals()}
          className="self-start sm:self-center px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider border border-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 p-3">
        <Filter className="w-4 h-4 text-slate-500 shrink-0 ml-1" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
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
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                statusFilter === item.id
                  ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-gray-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-8 h-8 border-2 border-[#1d4ed8] border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-mono font-bold text-slate-500 uppercase">
              Đang tải danh sách kháng nghị...
            </p>
          </div>
        ) : appeals.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              Không có đơn kháng nghị nào phù hợp bộ lọc.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-gray-200 text-slate-700 uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-3 border-r border-gray-200">Người dùng</th>
                  <th className="p-3 border-r border-gray-200">Phân loại</th>
                  <th className="p-3 border-r border-gray-200">Lý do kháng nghị</th>
                  <th className="p-3 border-r border-gray-200">Thời gian gửi</th>
                  <th className="p-3 border-r border-gray-200">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appeals.map((appeal) => (
                  <tr key={appeal.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 border-r border-gray-200 max-w-[200px]">
                      <div className="font-bold text-slate-900 truncate" title={getUserName(appeal)}>
                        {getUserName(appeal)}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 truncate" title={getUserEmail(appeal)}>
                        {getUserEmail(appeal)}
                      </div>
                    </td>
                    <td className="p-3 border-r border-gray-200 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-[10px] font-bold uppercase text-slate-700">
                        {getCategoryLabel(appeal.category)}
                      </span>
                    </td>
                    <td className="p-3 border-r border-gray-200 max-w-[280px]">
                      <p className="line-clamp-2 text-slate-800 font-medium leading-relaxed">
                        {appeal.reason}
                      </p>
                      {getSupporting(appeal) && (
                        <span className="text-[10px] text-slate-500 font-mono block truncate mt-0.5">
                          Tài liệu: {getSupporting(appeal)}
                        </span>
                      )}
                    </td>
                    <td className="p-3 border-r border-gray-200 whitespace-nowrap font-mono text-[11px] text-slate-600 font-bold">
                      {formatDate(appeal)}
                    </td>
                    <td className="p-3 border-r border-gray-200 whitespace-nowrap">
                      {getStatusBadge(appeal.status)}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenReview(appeal)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1d4ed8] font-bold text-[11px] uppercase tracking-wider border border-blue-200 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
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
          <div className="flex items-center justify-between p-3 border-t border-gray-200 bg-slate-50">
            <span className="text-xs font-mono font-bold text-slate-600">
              Trang {page} / {totalPages} ({totalCount} kháng nghị)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 border border-gray-300 text-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 border border-gray-300 text-slate-700 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review & Resolution Modal */}
      {activeAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-gray-200 w-full max-w-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#1d4ed8] text-white text-[10px] font-bold uppercase tracking-wider">
                  QUẢN TRỊ KHÁNG NGHỊ
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  ID: {activeAppeal.id}
                </span>
              </div>
              <button
                disabled={actionLoading}
                onClick={handleCloseReview}
                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Meta Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">
                  {getUserName(activeAppeal)}
                </span>
                <span className="font-mono text-slate-600 font-bold">
                  {getUserEmail(activeAppeal)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 font-mono">
                <span>Phân loại: {getCategoryLabel(activeAppeal.category)}</span>
                <span>
                  Gửi ngày: {formatDateTime(activeAppeal)}
                </span>
              </div>
            </div>

            {/* Submitted Appeal Detail */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                Nội dung kháng nghị từ người dùng:
              </label>
              <div className="p-3 bg-white border border-gray-200 text-xs font-medium text-slate-800 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                {activeAppeal.reason}
              </div>
              {getSupporting(activeAppeal) && (
                <div className="text-[11px] text-slate-600 font-mono pt-1">
                  <span className="font-bold">Tài liệu đính kèm: </span>
                  <span className="break-all">{getSupporting(activeAppeal)}</span>
                </div>
              )}
            </div>

            {/* Decision Radio Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                Quyết định xử lý:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewDecision("approved")}
                  className={`p-2.5 border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    reviewDecision === "approved"
                      ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-gray-200"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Chấp thuận &amp; Mở khóa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewDecision("rejected")}
                  className={`p-2.5 border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    reviewDecision === "rejected"
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-gray-200"
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Từ chối kháng nghị</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewDecision("under_review")}
                  className={`p-2.5 border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    reviewDecision === "under_review"
                      ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-gray-200"
                  }`}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Đang xem xét</span>
                </button>
              </div>
            </div>

            {/* Reviewer Note Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                Ghi chú / Lý do phản hồi qua email cho người dùng:
                {reviewDecision === "rejected" && <span className="text-[#1d4ed8] ml-1">* (Bắt buộc khi từ chối)</span>}
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
                className="w-full px-3 py-2 text-xs font-medium border border-gray-300 focus:border-[#1d4ed8] bg-white rounded-none outline-none focus:ring-1 focus:ring-[#1d4ed8] resize-none"
              />
            </div>

            {/* Feedback alert */}
            {feedback && (
              <div
                className={`p-3 border text-xs font-bold ${
                  feedback.type === "success"
                    ? "bg-blue-50 border-blue-200 text-blue-950"
                    : "bg-red-50 border-red-200 text-red-950"
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
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider border border-gray-200 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleProcessAppeal}
                className="px-5 py-2 text-white font-bold text-xs uppercase tracking-wider bg-[#1d4ed8] hover:bg-[#1e40af] transition-colors cursor-pointer border border-[#1d4ed8]"
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
