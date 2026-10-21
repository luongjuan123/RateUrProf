"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Flag,
  CheckCircle2,
  EyeOff,
  Trash2,
  RotateCw,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  X,
  Star,
  GraduationCap,
  Building2,
  BookOpen,
  User,
  Clock,
  Eye,
  Copy,
  Check,
} from "lucide-react";
import { Report, CorrectionRequest } from "@/types";

export function ModerationSection({ lang = "vi" }: { lang?: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchModeration = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/moderation");
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
        setCorrections(data.corrections || []);
      }
    } catch (err) {
      console.error("Fetch moderation error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModeration();
  }, [fetchModeration]);

  const handleModerate = async (
    reviewId: string,
    action: "hide" | "publish" | "delete",
    reportId?: string
  ) => {
    setSubmittingId(reportId || reviewId);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewId,
          reportId,
          reason: `Quyết định kiểm duyệt [${action.toUpperCase()}] từ trang Quản trị`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Đã thực hiện [${action.toUpperCase()}] đối với đánh giá thành công!`,
        });
        if (previewReport && (previewReport.id === reportId || previewReport.reviewId === reviewId)) {
          setPreviewReport(null);
        }
        await fetchModeration();
      } else {
        setFeedback({ type: "error", message: data.error || "Không thể thực hiện kiểm duyệt." });
      }
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Lỗi kết nối." });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const pendingReports = reports.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-gray-900">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-gray-950 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#e03a3e]" />
            <span>Kiểm duyệt Đánh giá & Xử lý Báo cáo Vi phạm</span>
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Quy trình tuân thủ tiêu chuẩn cộng đồng và Nghị định 13/2023/NĐ-CP về quyền cải chính / gỡ bỏ thông tin
          </p>
        </div>
        <button
          onClick={fetchModeration}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 border-2 flex items-center justify-between text-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold"
              : "bg-red-50 border-red-400 text-red-950 font-bold"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="p-1 hover:bg-black/10">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reports Queue */}
      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
          <Flag className="w-4 h-4 text-amber-600" />
          <span>Báo cáo Vi phạm Chờ xử lý ({pendingReports.length})</span>
        </h3>

        {loading ? (
          <div className="p-12 text-center text-gray-500 font-mono bg-white border-2 border-gray-900">
            <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-900" />
            Đang tải danh sách báo cáo...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center bg-white border-2 border-gray-900 text-xs text-gray-500">
            Không có báo cáo vi phạm nào cần xử lý.
          </div>
        ) : (
          reports.map((rep) => {
            const publicRateUrl = `/${lang}/professors/${rep.professorId}#review-${rep.reviewId}`;
            const profUrl = `/${lang}/professors/${rep.professorId}`;
            const commentToDisplay = rep.reviewFullComment || rep.reviewCommentSnippet || "Chưa có nội dung bình luận.";

            return (
              <div
                key={rep.id}
                className="bg-white border-2 border-gray-900 p-5 space-y-4 shadow-sm hover:border-black transition-colors"
              >
                {/* Top Bar of Report Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                        rep.status === "pending"
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-emerald-100 text-emerald-900 border-emerald-300"
                      }`}
                    >
                      {rep.status === "pending" ? "Chờ xử lý" : "Đã xử lý"}
                    </span>

                    {/* Professor link */}
                    <Link
                      href={profUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-black text-gray-950 text-sm hover:text-[#e03a3e] hover:underline flex items-center gap-1 group"
                      title="Mở hồ sơ giảng viên trong tab mới"
                    >
                      <span>{rep.professorName || "Hồ sơ Giảng viên"}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#e03a3e] transition-colors" />
                    </Link>

                    {/* University Tag */}
                    {(rep.universityShortName || rep.universityName) && (
                      <span className="px-2 py-0.5 bg-gray-100 border border-gray-300 text-[10px] font-mono font-bold text-gray-700">
                        {rep.universityShortName || rep.universityName}
                      </span>
                    )}
                  </div>

                  {/* Direct Link to that Rate */}
                  <div className="flex items-center gap-2">
                    <a
                      href={publicRateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-gray-100 text-gray-900 border-2 border-gray-900 text-xs font-bold font-mono shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                      title="Mở trực tiếp vị trí đánh giá này trên trang công khai"
                    >
                      <span>Mở liên kết đánh giá</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#e03a3e]" />
                    </a>
                    <span className="text-[11px] font-mono text-gray-500 whitespace-nowrap">
                      {new Date(rep.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                </div>

                {/* Report Reason & Details */}
                <div className="text-xs text-gray-700 space-y-1 bg-red-50/50 p-3 border border-red-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-950 uppercase text-[11px] tracking-wide">
                      Lý do báo cáo:
                    </span>
                    <span className="px-2 py-0.5 bg-red-100 text-red-900 font-bold border border-red-300 text-[11px]">
                      {rep.reason}
                    </span>
                  </div>
                  {rep.details && (
                    <div className="text-xs text-gray-800 pt-0.5">
                      <strong className="text-gray-950">Chi tiết phản ánh từ người dùng:</strong> {rep.details}
                    </div>
                  )}
                </div>

                {/* PREVIEW OF THE RATE / REVIEW */}
                <div className="bg-amber-50/40 border-2 border-amber-300 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-950 font-mono text-[10px] font-black uppercase tracking-wider border border-amber-300">
                        Nội dung Đánh giá (Rate Preview)
                      </span>
                      {rep.courseName && (
                        <span className="font-bold text-gray-950 text-xs flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                          <span>Môn học: <strong className="text-[#e03a3e]">{rep.courseName}</strong></span>
                        </span>
                      )}
                    </div>

                    {/* Scores & Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {typeof rep.overallRating === "number" && (
                        <div
                          className={`px-2.5 py-0.5 border text-xs font-mono font-black flex items-center gap-1 ${
                            rep.overallRating >= 4
                              ? "bg-emerald-100 border-emerald-400 text-emerald-950"
                              : rep.overallRating >= 3
                              ? "bg-amber-100 border-amber-400 text-amber-950"
                              : "bg-red-100 border-red-400 text-red-950"
                          }`}
                          title="Điểm đánh giá chất lượng"
                        >
                          <Star className="w-3 h-3 fill-current" />
                          <span>{rep.overallRating.toFixed(1)}</span>
                          <span className="text-[10px] opacity-75 font-normal">/ 5.0</span>
                        </div>
                      )}

                      {typeof rep.difficultyScore === "number" && (
                        <div className="px-2 py-0.5 bg-white border border-gray-300 text-gray-800 text-xs font-mono font-bold">
                          Độ khó: {rep.difficultyScore.toFixed(1)}/5.0
                        </div>
                      )}

                      {rep.reviewStatus && (
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${
                            rep.reviewStatus === "published"
                              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                              : "bg-gray-100 border-gray-300 text-gray-600"
                          }`}
                        >
                          {rep.reviewStatus === "published" ? "Đang hiển thị" : rep.reviewStatus === "hidden" ? "Đã ẩn" : rep.reviewStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Full Comment Quote Box */}
                  <div className="relative p-3.5 bg-white border border-amber-200 font-serif italic text-gray-900 leading-relaxed text-xs shadow-inner">
                    &ldquo;{commentToDisplay}&rdquo;
                  </div>

                  {/* Review Metadata Footprint */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-600 pt-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-500" />
                        <span>Người đăng: <strong className="text-gray-900">{rep.reviewerName || "Sinh viên ẩn danh"}</strong></span>
                      </span>
                      {rep.takeAgain !== undefined && (
                        <span>
                          Học lại:{" "}
                          <strong className={rep.takeAgain ? "text-emerald-700 font-bold" : "text-red-700 font-bold"}>
                            {rep.takeAgain ? "Có" : "Không"}
                          </strong>
                        </span>
                      )}
                      {rep.attendanceMandatory !== undefined && (
                        <span>
                          Điểm danh: <strong className="text-gray-900">{rep.attendanceMandatory ? "Bắt buộc" : "Không bắt buộc"}</strong>
                        </span>
                      )}
                      {rep.gradeReceived && (
                        <span>
                          Điểm số: <strong className="text-gray-900">{rep.gradeReceived}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {rep.reviewCreatedAt && (
                        <span className="font-mono text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>Đăng ngày: {new Date(rep.reviewCreatedAt).toLocaleDateString("vi-VN")}</span>
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-gray-400">
                        Mã review: {rep.reviewId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={publicRateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-900 font-bold uppercase border border-gray-300 transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Mở trực tiếp vị trí đánh giá này trên trang hồ sơ giảng viên"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#e03a3e]" />
                      <span>Xem trên trang công khai</span>
                    </a>

                    <button
                      onClick={() => setPreviewReport(rep)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold uppercase border border-blue-200 transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-700" />
                      <span>Chi tiết đánh giá</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleModerate(rep.reviewId, "hide", rep.id)}
                      disabled={submittingId === rep.id}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold uppercase border border-gray-300 transition-colors flex items-center gap-1.5"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Ẩn đánh giá</span>
                    </button>
                    <button
                      onClick={() => handleModerate(rep.reviewId, "delete", rep.id)}
                      disabled={submittingId === rep.id}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold uppercase transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa đánh giá</span>
                    </button>
                    <button
                      onClick={() => handleModerate(rep.reviewId, "publish", rep.id)}
                      disabled={submittingId === rep.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Bỏ qua &amp; Giữ lại</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DETAILED PREVIEW MODAL */}
      {previewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white border-4 border-gray-900 shadow-[8px_8px_0px_#000] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#e03a3e]" />
                <h3 className="font-mono font-black text-sm uppercase tracking-wider">
                  Chi tiết Đánh giá được Báo cáo
                </h3>
              </div>
              <button
                onClick={() => setPreviewReport(null)}
                className="p-1 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Professor & Course */}
              <div className="p-4 bg-gray-50 border-2 border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-mono font-bold text-gray-500 uppercase">Giảng viên mục tiêu</div>
                  <div className="text-base font-black text-gray-950 flex items-center gap-2 mt-0.5">
                    <span>{previewReport.professorName || "Hồ sơ Giảng viên"}</span>
                    {(previewReport.universityShortName || previewReport.universityName) && (
                      <span className="px-2 py-0.5 bg-white border border-gray-300 text-xs font-mono font-bold text-gray-700">
                        {previewReport.universityShortName || previewReport.universityName}
                      </span>
                    )}
                  </div>
                  {previewReport.courseName && (
                    <div className="text-xs text-gray-700 mt-1">
                      Môn học: <strong className="text-[#e03a3e]">{previewReport.courseName}</strong>
                    </div>
                  )}
                </div>

                {/* Public Link */}
                <a
                  href={`/${lang}/professors/${previewReport.professorId}#review-${previewReport.reviewId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-black text-white font-bold uppercase transition-colors shrink-0"
                >
                  <span>Mở trên web</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Score Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-emerald-50 border border-emerald-300">
                  <div className="text-[10px] font-bold uppercase text-emerald-800">Chất lượng</div>
                  <div className="text-xl font-black text-emerald-950 font-mono mt-0.5">
                    ★ {previewReport.overallRating?.toFixed(1) || "N/A"}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-300">
                  <div className="text-[10px] font-bold uppercase text-gray-600">Độ khó</div>
                  <div className="text-xl font-black text-gray-950 font-mono mt-0.5">
                    {previewReport.difficultyScore?.toFixed(1) || "N/A"}/5
                  </div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-300">
                  <div className="text-[10px] font-bold uppercase text-gray-600">Học lại?</div>
                  <div className="text-base font-black text-gray-950 mt-1">
                    {previewReport.takeAgain !== undefined ? (previewReport.takeAgain ? "CÓ" : "KHÔNG") : "N/A"}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-300">
                  <div className="text-[10px] font-bold uppercase text-gray-600">Điểm số</div>
                  <div className="text-base font-black text-gray-950 mt-1">
                    {previewReport.gradeReceived || "N/A"}
                  </div>
                </div>
              </div>

              {/* Full Comment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-950 uppercase text-[11px]">Nội dung nhận xét đầy đủ:</span>
                  <button
                    onClick={() => handleCopyText(previewReport.reviewFullComment || previewReport.reviewCommentSnippet || "", "modal")}
                    className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-black font-mono font-bold"
                  >
                    {copiedId === "modal" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép nội dung</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 bg-gray-50 border-2 border-gray-300 font-serif italic text-sm text-gray-900 leading-relaxed shadow-inner select-text">
                  &ldquo;{previewReport.reviewFullComment || previewReport.reviewCommentSnippet || "Chưa có nội dung bình luận."}&rdquo;
                </div>
              </div>

              {/* Report Context */}
              <div className="p-3 bg-red-50 border border-red-200 space-y-1">
                <div className="font-bold text-red-950">Lý do báo cáo: {previewReport.reason}</div>
                {previewReport.details && (
                  <div className="text-gray-800">Chi tiết: {previewReport.details}</div>
                )}
                <div className="text-[10px] font-mono text-gray-500 pt-1">
                  Mã báo cáo: {previewReport.id} • Mã review: {previewReport.reviewId}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-gray-200 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => setPreviewReport(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold uppercase transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={() => handleModerate(previewReport.reviewId, "hide", previewReport.id)}
                  disabled={submittingId === previewReport.id}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold uppercase transition-colors flex items-center gap-1.5"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Ẩn đánh giá này</span>
                </button>
                <button
                  onClick={() => handleModerate(previewReport.reviewId, "delete", previewReport.id)}
                  disabled={submittingId === previewReport.id}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold uppercase transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa vĩnh viễn</span>
                </button>
                <button
                  onClick={() => handleModerate(previewReport.reviewId, "publish", previewReport.id)}
                  disabled={submittingId === previewReport.id}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Bỏ qua báo cáo &amp; Giữ lại</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
