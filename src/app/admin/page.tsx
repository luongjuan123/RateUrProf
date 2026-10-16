"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getAllReports,
  moderateReview,
  ensureDatabaseSeeded,
  getProfessors,
  getUniversities,
} from "@/lib/dataService";
import {
  getDataQualityReport,
  getEntityMatchCandidates,
  resolveEntityCandidate,
  getSourceRegistry,
} from "@/lib/academicDataService";
import {
  Report,
  Professor,
  University,
  DataQualityReport,
  EntityMatchCandidate,
  SourceRegistryItem,
} from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  EyeOff,
  Trash2,
  RotateCw,
  Database,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  BarChart3,
  GitMerge,
  Globe2,
  Sparkles,
  Layers,
  FileCheck,
  AlertCircle,
} from "lucide-react";

export default function AdminModerationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"moderation" | "quality" | "dedup_sources">("moderation");
  const [reports, setReports] = useState<Report[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [qaReport, setQaReport] = useState<DataQualityReport | null>(null);
  const [candidates, setCandidates] = useState<EntityMatchCandidate[]>([]);
  const [sources, setSources] = useState<SourceRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [reps, profs, unis, qa, cands, srcs] = await Promise.all([
        getAllReports(),
        getProfessors(),
        getUniversities(),
        getDataQualityReport(),
        getEntityMatchCandidates(),
        getSourceRegistry(),
      ]);
      setReports(reps);
      setProfessors(profs);
      setUniversities(unis);
      setQaReport(qa);
      setCandidates(cands);
      setSources(srcs);
    } catch (err: unknown) {
      console.error("Admin load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const init = async () => {
      try {
        const [reps, profs, unis, qa, cands, srcs] = await Promise.all([
          getAllReports(),
          getProfessors(),
          getUniversities(),
          getDataQualityReport(),
          getEntityMatchCandidates(),
          getSourceRegistry(),
        ]);
        if (!ignore) {
          setReports(reps);
          setProfessors(profs);
          setUniversities(unis);
          setQaReport(qa);
          setCandidates(cands);
          setSources(srcs);
        }
      } catch (err: unknown) {
        console.error("Admin load error:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const handleModerate = async (
    reviewId: string,
    action: "hide" | "publish" | "delete",
    reportId?: string
  ) => {
    setActionLoading(reportId || reviewId);
    try {
      const ok = await moderateReview(reviewId, action, reportId);
      if (ok) {
        setMessage({
          text: `Đã thực hiện hành động [${action.toUpperCase()}] thành công!`,
          type: "success",
        });
        await loadData();
      } else {
        setMessage({ text: "Lỗi khi xử lý kiểm duyệt.", type: "error" });
      }
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Lỗi xử lý.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveCandidate = async (
    candidateId: string,
    action: "merged" | "dismissed"
  ) => {
    setActionLoading(candidateId);
    try {
      const ok = await resolveEntityCandidate(candidateId, action, user?.email || "admin");
      if (ok) {
        setMessage({
          text: `Đã xử lý ứng viên danh tính: [${action === "merged" ? "HỢP NHẤT HỒ SƠ" : "PHÂN TÁCH / BÁC BỎ"}]!`,
          type: "success",
        });
        await loadData();
      } else {
        setMessage({ text: "Lỗi xử lý ứng viên.", type: "error" });
      }
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Lỗi xử lý.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSeedDatabase = async () => {
    setActionLoading("seed");
    try {
      await ensureDatabaseSeeded();
      setMessage({
        text: "Đã đồng bộ cơ sở dữ liệu giảng viên có kiểm chứng (.edu.vn) thành công vào Cloud Firestore!",
        type: "success",
      });
      await loadData();
    } catch (err: unknown) {
      setMessage({
        text: "Lỗi nạp dữ liệu: " + (err instanceof Error ? err.message : String(err)),
        type: "error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const pendingReports = reports.filter((r) => r.status === "pending");
  const pendingCandidates = candidates.filter((c) => c.status === "pending");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-gray-900 pb-4 gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-[#e03a3e]">
            Ban Kiểm duyệt &amp; Vận hành Dữ liệu Toàn quốc
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-gray-950 mt-1">
            Bảng điều khiển Quản trị (Admin Operations)
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Theo dõi báo cáo vi phạm, đánh giá chất lượng dữ liệu toàn quốc, xử lý trùng lặp và vận hành nguồn tin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-white border border-gray-300 hover:bg-gray-50 text-gray-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>

          <button
            onClick={handleSeedDatabase}
            disabled={actionLoading === "seed"}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-gray-800 transition-colors rounded-none"
          >
            <Database className="w-3.5 h-3.5 text-[#e03a3e]" />
            <span>Đồng bộ từ Cổng thông tin chính thức (.edu.vn)</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 border text-xs font-bold flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="underline text-[10px]">
            Đóng
          </button>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("moderation")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === "moderation"
              ? "border-[#e03a3e] text-[#e03a3e]"
              : "border-transparent text-gray-500 hover:text-black"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Kiểm duyệt Đánh giá ({pendingReports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("quality")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === "quality"
              ? "border-[#e03a3e] text-[#e03a3e]"
              : "border-transparent text-gray-500 hover:text-black"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Chất lượng &amp; Độ bao phủ Toàn quốc</span>
        </button>

        <button
          onClick={() => setActiveTab("dedup_sources")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
            activeTab === "dedup_sources"
              ? "border-[#e03a3e] text-[#e03a3e]"
              : "border-transparent text-gray-500 hover:text-black"
          }`}
        >
          <GitMerge className="w-4 h-4" />
          <span>
            Xử lý Trùng lặp &amp; Nguồn tin ({pendingCandidates.length} ứng viên)
          </span>
        </button>
      </div>

      {/* TAB 1: REVIEW MODERATION */}
      {activeTab === "moderation" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-gray-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Báo cáo chờ duyệt
              </div>
              <div className="text-3xl font-black text-[#e03a3e] mt-1">
                {pendingReports.length}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {reports.length} tổng số báo cáo đã tiếp nhận
              </p>
            </div>

            <div className="p-5 bg-white border border-gray-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Tổng số Giảng viên
              </div>
              <div className="text-3xl font-black text-gray-900 mt-1">
                {professors.length}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Trên các trường ĐH toàn quốc
              </p>
            </div>

            <div className="p-5 bg-white border border-gray-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Trường Đại học
              </div>
              <div className="text-3xl font-black text-gray-900 mt-1">
                {universities.length}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Bắc, Trung, Nam
              </p>
            </div>

            <div className="p-5 bg-white border border-gray-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Trạng thái bảo mật
              </div>
              <div className="text-xl font-black text-emerald-600 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" />
                <span>Đã kích hoạt</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Firestore Rules &amp; PII Protection
              </p>
            </div>
          </div>

          {/* Reports Table Section */}
          <div className="bg-white border border-gray-200 space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="text-base font-extrabold uppercase tracking-tight text-gray-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#e03a3e]" />
                <span>Danh sách Báo cáo Vi phạm ({reports.length})</span>
              </h2>
              <span className="text-xs text-gray-500 font-medium">
                Tự động sắp xếp theo thời gian mới nhất
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-gray-500 font-bold">
                Đang tải dữ liệu kiểm duyệt...
              </div>
            ) : reports.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-gray-900 text-sm">
                  Không có báo cáo vi phạm nào!
                </h4>
                <p className="text-xs text-gray-500">
                  Cộng đồng RateProfCuaBan đang hoạt động văn minh và tích cực.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {reports.map((rep) => (
                  <div key={rep.id} className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black uppercase ${
                            rep.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {rep.status === "pending" ? "Chờ xử lý" : "Đã giải quyết"}
                        </span>
                        <span className="text-xs font-bold text-red-600">
                          Lý do: {rep.reason}
                        </span>
                      </div>

                      <span className="text-[11px] text-gray-500">
                        {new Date(rep.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>

                    {rep.reviewCommentSnippet && (
                      <div className="p-3 bg-gray-50 border border-gray-200 text-xs text-gray-700 font-mono">
                        “{rep.reviewCommentSnippet}”
                      </div>
                    )}

                    {rep.details && (
                      <p className="text-xs text-gray-600 italic">
                        <strong>Ghi chú người báo cáo:</strong> {rep.details}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <button
                        onClick={() => handleModerate(rep.reviewId, "hide", rep.id)}
                        disabled={actionLoading === rep.id}
                        className="flex items-center gap-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold border border-amber-300"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Ẩn đánh giá</span>
                      </button>

                      <button
                        onClick={() => handleModerate(rep.reviewId, "delete", rep.id)}
                        disabled={actionLoading === rep.id}
                        className="flex items-center gap-1 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-800 font-semibold border border-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa vĩnh viễn</span>
                      </button>

                      <button
                        onClick={() => handleModerate(rep.reviewId, "publish", rep.id)}
                        disabled={actionLoading === rep.id}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold border border-gray-300"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Bác bỏ (Bình luận hợp lệ)</span>
                      </button>

                      {rep.professorId && (
                        <Link
                          href={`/professors/${rep.professorId}`}
                          target="_blank"
                          className="flex items-center gap-1 px-3 py-1 text-gray-600 hover:text-black font-semibold ml-auto"
                        >
                          <span>Xem hồ sơ giảng viên</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DATA QUALITY & COVERAGE */}
      {activeTab === "quality" && qaReport && (
        <div className="space-y-6">
          {/* Quality High-Level Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-gray-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Độ phủ Đại học Toàn quốc
              </div>
              <div className="text-3xl font-black text-gray-950 mt-1">
                {qaReport.totalUniversities}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                {qaReport.universitiesWithRegisteredDomains} trường có domain .edu.vn xác thực
              </p>
            </div>

            <div className="p-5 bg-white border border-gray-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Tỷ lệ Giảng viên Đã Kiểm chứng
              </div>
              <div className="text-3xl font-black text-emerald-600 mt-1">
                {qaReport.verifiedProfessorsCount ?? 0} / {qaReport.totalProfessors}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {(
                  ((qaReport.verifiedProfessorsCount || 0) /
                    (qaReport.totalProfessors || 1)) *
                  100
                ).toFixed(0)}
                % có bằng chứng đối soát chính thức
              </p>
            </div>

            <div className="p-5 bg-white border border-gray-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Ứng viên Trùng tên / Nghi ngờ
              </div>
              <div className="text-3xl font-black text-amber-600 mt-1">
                {qaReport.duplicateCandidatesCount}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Cần chuyên viên quản trị rà soát
              </p>
            </div>

            <div className="p-5 bg-white border border-gray-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Tình trạng Bản quyền Hình ảnh
              </div>
              <div className="text-3xl font-black text-blue-600 mt-1">
                {qaReport.profilesWithImagesCount}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {qaReport.imagesPendingReviewCount} ảnh đang chờ duyệt bản quyền
              </p>
            </div>
          </div>

          {/* Regional Balance Breakdown */}
          <div className="bg-white border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-blue-600" />
              Cân bằng Độ bao phủ Địa lý 3 Miền (Bắc - Trung - Nam)
            </h3>
            <p className="text-xs text-gray-600">
              Cam kết đo lường thực tế, không công bố 100% bao phủ khi chưa kiểm chứng đầy đủ.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* North */}
              <div className="p-4 border border-blue-100 bg-blue-50/50 rounded-xl">
                <span className="text-xs font-bold text-blue-900 uppercase">Miền Bắc</span>
                <div className="text-2xl font-black text-blue-950 mt-1">
                  {qaReport.coverageByRegion?.north?.universities || 0} Trường
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {qaReport.coverageByRegion?.north?.professors || 0} Giảng viên kiểm chứng
                </div>
                <div className="w-full bg-blue-200 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        ((qaReport.coverageByRegion?.north?.professors || 0) /
                          (qaReport.totalProfessors || 1)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Central */}
              <div className="p-4 border border-amber-100 bg-amber-50/50 rounded-xl">
                <span className="text-xs font-bold text-amber-900 uppercase">Miền Trung</span>
                <div className="text-2xl font-black text-amber-950 mt-1">
                  {qaReport.coverageByRegion?.central?.universities || 0} Trường
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  {qaReport.coverageByRegion?.central?.professors || 0} Giảng viên kiểm chứng
                </div>
                <div className="w-full bg-amber-200 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-amber-600 h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        ((qaReport.coverageByRegion?.central?.professors || 0) /
                          (qaReport.totalProfessors || 1)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* South */}
              <div className="p-4 border border-emerald-100 bg-emerald-50/50 rounded-xl">
                <span className="text-xs font-bold text-emerald-900 uppercase">Miền Nam</span>
                <div className="text-2xl font-black text-emerald-950 mt-1">
                  {qaReport.coverageByRegion?.south?.universities || 0} Trường
                </div>
                <div className="text-xs text-emerald-700 mt-1">
                  {qaReport.coverageByRegion?.south?.professors || 0} Giảng viên kiểm chứng
                </div>
                <div className="w-full bg-emerald-200 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        ((qaReport.coverageByRegion?.south?.professors || 0) /
                          (qaReport.totalProfessors || 1)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Missing Fields Tracker */}
          <div className="bg-white border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              Theo dõi Trường Dữ liệu Còn thiếu (Missing Key Fields)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 border border-gray-200 text-center">
                <div className="text-xs font-semibold text-gray-500">Thiếu Tiểu sử</div>
                <div className="text-xl font-bold text-gray-900 mt-1">
                  {qaReport.missingKeyFields?.missingBio || 0}
                </div>
              </div>
              <div className="p-3 border border-gray-200 text-center">
                <div className="text-xs font-semibold text-gray-500">Thiếu Môn giảng dạy</div>
                <div className="text-xl font-bold text-gray-900 mt-1">
                  {qaReport.missingKeyFields?.missingCourses || 0}
                </div>
              </div>
              <div className="p-3 border border-gray-200 text-center">
                <div className="text-xs font-semibold text-gray-500">Thiếu Hướng nghiên cứu</div>
                <div className="text-xl font-bold text-gray-900 mt-1">
                  {qaReport.missingKeyFields?.missingResearchInterests || 0}
                </div>
              </div>
              <div className="p-3 border border-gray-200 text-center">
                <div className="text-xs font-semibold text-gray-500">Thiếu Ảnh đại diện</div>
                <div className="text-xl font-bold text-gray-900 mt-1">
                  {qaReport.missingKeyFields?.missingAvatar || 0}
                </div>
                <span className="text-[10px] text-blue-600 block mt-1">
                  (Dùng Avatar SVG chuẩn)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEDUPLICATION & SOURCE REGISTRY */}
      {activeTab === "dedup_sources" && (
        <div className="space-y-6">
          {/* Identity Resolution Candidates Queue */}
          <div className="bg-white border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-[#e03a3e]" />
                Hàng đợi Xử lý Trùng lặp &amp; Đồng âm (Entity Resolution Queue)
              </h3>
              <span className="text-xs font-semibold text-gray-500">
                {pendingCandidates.length} hồ sơ chờ quyết định
              </span>
            </div>

            {candidates.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                Không có trường hợp trùng lặp hoặc nghi vấn đồng âm nào.
              </p>
            ) : (
              <div className="divide-y divide-gray-200">
                {candidates.map((cand) => (
                  <div key={cand.id} className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${
                            cand.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : cand.status === "merged"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {cand.status === "pending"
                            ? "Chờ duyệt"
                            : cand.status === "merged"
                            ? "Đã hợp nhất"
                            : "Đã phân tách"}
                        </span>
                        <span className="text-xs font-bold text-gray-900">
                          Độ tương đồng thuật toán: {(cand.matchScore * 100).toFixed(0)}%
                        </span>
                      </div>

                      <span className="text-[11px] text-gray-500">
                        {new Date(cand.detectedAt).toLocaleString("vi-VN")}
                      </span>
                    </div>

                    {/* Comparison Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-[10px] font-bold uppercase text-gray-400">
                          Hồ sơ A (Nguồn trích xuất):
                        </span>
                        <div className="font-bold text-gray-900 text-sm mt-0.5">
                          {cand.sourceName}
                        </div>
                        <div className="text-gray-600 mt-0.5">
                          {cand.sourceUniversity}
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono mt-1 block">
                          ID: {cand.sourceProfessorId}
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-[10px] font-bold uppercase text-gray-400">
                          Hồ sơ B (Ứng viên trùng khớp):
                        </span>
                        <div className="font-bold text-gray-900 text-sm mt-0.5">
                          {cand.candidateName}
                        </div>
                        <div className="text-gray-600 mt-0.5">
                          {cand.candidateUniversity}
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono mt-1 block">
                          ID: {cand.candidateProfessorId}
                        </span>
                      </div>
                    </div>

                    {/* Match Reasons */}
                    <div className="text-xs text-gray-600 space-y-1">
                      <span className="font-semibold text-gray-700">Cơ sở đánh giá đối sánh:</span>
                      <ul className="list-disc ml-5 space-y-0.5 text-[11px]">
                        {cand.matchReasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions */}
                    {cand.status === "pending" && (
                      <div className="flex items-center gap-2 pt-1 text-xs">
                        <button
                          onClick={() => handleResolveCandidate(cand.id, "merged")}
                          disabled={actionLoading === cand.id}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded"
                        >
                          Hợp nhất hồ sơ (Cùng 1 người)
                        </button>
                        <button
                          onClick={() => handleResolveCandidate(cand.id, "dismissed")}
                          disabled={actionLoading === cand.id}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded"
                        >
                          Bác bỏ (2 cá nhân khác nhau / Đồng âm)
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Registered Sources Table */}
          <div className="bg-white border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-blue-600" />
                Danh mục Nguồn Thu thập Đã Đăng ký (Source Registry - {sources.length} nguồn)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Trường</th>
                    <th className="py-2.5 px-3">Tên miền</th>
                    <th className="py-2.5 px-3">Loại nguồn</th>
                    <th className="py-2.5 px-3">Chính sách Crawl</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-3">URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {sources.slice(0, 15).map((src) => (
                    <tr key={src.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 font-sans font-bold text-gray-900">
                        {src.universityId.toUpperCase()}
                      </td>
                      <td className="py-2.5 px-3 text-blue-600">{src.domain}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {src.sourceType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            src.crawlPolicy === "allowed"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {src.crawlPolicy}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                          {src.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 truncate max-w-xs text-gray-500">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline text-blue-600"
                        >
                          {src.url}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
