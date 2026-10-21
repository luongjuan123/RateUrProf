"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  MessageSquare,
  Globe2,
  AlertTriangle,
  CheckCircle2,
  RotateCw,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";

interface OverviewMetrics {
  users: { total: number; active: number; suspended: number };
  lecturers: { total: number; gsCount: number; pgsCount: number; verified: number };
  universities: { total: number; withDomain: number; north: number; central: number; south: number };
  faculties: { totalFaculties: number; totalDepartments: number };
  reviews: { published: number; hidden: number; pendingReports: number; pendingCorrections: number };
  crawler: { totalJobs: number; queued: number; running: number; completed: number; failed: number; activeCampaigns: number };
  recentActivity: { id: string; actor: string; action: string; targetType: string; targetId: string | null; reason: string | null; createdAt: number }[];
  recentCrawlJobs: { id: string; universityId: string; url: string; status: string; lastError: string | null; completedAt: number | null }[];
  alerts: { id: string; type: "warning" | "info" | "success"; title: string; message: string }[];
}

export function OverviewSection({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [data, setData] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/overview");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Overview fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <RotateCw className="w-8 h-8 animate-spin text-gray-900" />
        <span className="text-xs uppercase font-mono tracking-widest text-gray-500">
          Đang tải dữ liệu tổng quan thời gian thực...
        </span>
      </div>
    );
  }

  if (!loading && !data) {
    return (
      <div className="p-8 border-2 border-red-500 bg-red-50 text-red-950 flex flex-col items-center justify-center gap-3">
        <AlertTriangle className="w-8 h-8 text-red-600" />
        <p className="font-bold text-sm">Không thể kết nối đến trung tâm dữ liệu tổng quan.</p>
        <button
          onClick={fetchOverview}
          className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-gray-900">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-gray-950">
            Trung tâm Điều hành Hệ thống RateUrProfs
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Số liệu thời gian thực từ Google Cloud SQL PostgreSQL & Hạ tầng Cloud Run
          </p>
        </div>
        <button
          onClick={fetchOverview}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Làm mới số liệu</span>
        </button>
      </div>

      {/* Operational Alerts */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="space-y-3">
          {data.alerts.map((al) => (
            <div
              key={al.id}
              className={`p-4 border-2 flex items-start gap-3 text-xs ${
                al.type === "warning"
                  ? "bg-amber-50 border-amber-400 text-amber-950"
                  : al.type === "info"
                  ? "bg-blue-50 border-blue-400 text-blue-950"
                  : "bg-emerald-50 border-emerald-400 text-emerald-950"
              }`}
            >
              {al.type === "warning" ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : al.type === "info" ? (
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="font-bold uppercase tracking-wider">{al.title}</div>
                <div className="text-gray-700 leading-relaxed">{al.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Core KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Lecturers */}
        <div
          onClick={() => onNavigate("lecturers")}
          className="p-5 bg-white border-2 border-gray-900 hover:border-[#e03a3e] transition-colors cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Hồ sơ Giảng viên</span>
            <GraduationCap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-gray-950 mt-2">
            {data?.lecturers?.total?.toLocaleString("vi-VN") || 0}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
            <span>{data?.lecturers?.gsCount || 0} Giáo sư • {data?.lecturers?.pgsCount || 0} PGS</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:text-[#e03a3e] transition-colors" />
          </div>
        </div>

        {/* Card 2: Universities */}
        <div
          onClick={() => onNavigate("universities")}
          className="p-5 bg-white border-2 border-gray-900 hover:border-[#e03a3e] transition-colors cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Cơ sở Giáo dục Đại học</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-gray-950 mt-2">
            {data?.universities?.total?.toLocaleString("vi-VN") || 0}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
            <span>{data?.universities?.withDomain || 0} trường có website chính thức</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:text-[#e03a3e] transition-colors" />
          </div>
        </div>

        {/* Card 3: Users */}
        <div
          onClick={() => onNavigate("users")}
          className="p-5 bg-white border-2 border-gray-900 hover:border-[#e03a3e] transition-colors cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Tài khoản Sinh viên</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-gray-950 mt-2">
            {data?.users?.total?.toLocaleString("vi-VN") || 0}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
            <span>{data?.users?.active || 0} đang hoạt động • {data?.users?.suspended || 0} bị khóa</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:text-[#e03a3e] transition-colors" />
          </div>
        </div>

        {/* Card 4: Reviews & Moderation */}
        <div
          onClick={() => onNavigate("moderation")}
          className="p-5 bg-white border-2 border-gray-900 hover:border-[#e03a3e] transition-colors cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Đánh giá & Báo cáo</span>
            <MessageSquare className="w-4 h-4 text-[#e03a3e]" />
          </div>
          <div className="text-3xl font-black text-gray-950 mt-2">
            {data?.reviews?.published || 0}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
            <span className="font-semibold text-amber-700">{data?.reviews?.pendingReports || 0} báo cáo cần duyệt</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:text-[#e03a3e] transition-colors" />
          </div>
        </div>
      </div>

      {/* Regional & Crawling Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Coverage Distribution */}
        <div className="bg-white border-2 border-gray-900 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-blue-600" />
              <span>Phân bổ Địa lý Cơ sở Đại học 3 Miền</span>
            </h3>
            <span className="text-[11px] font-mono text-gray-500">Việt Nam</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 border border-gray-200">
              <div className="text-[10px] font-bold text-gray-500 uppercase">Miền Bắc</div>
              <div className="text-2xl font-black text-blue-900 mt-1">{data?.universities?.north || 0}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Hà Nội & lân cận</div>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200">
              <div className="text-[10px] font-bold text-gray-500 uppercase">Miền Trung</div>
              <div className="text-2xl font-black text-amber-900 mt-1">{data?.universities?.central || 0}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Đà Nẵng, Huế, Tây Nguyên</div>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200">
              <div className="text-[10px] font-bold text-gray-500 uppercase">Miền Nam</div>
              <div className="text-2xl font-black text-emerald-900 mt-1">{data?.universities?.south || 0}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">TP.HCM & ĐBSCL</div>
            </div>
          </div>

          <div className="text-[11px] text-gray-600 bg-gray-50 p-3 border border-gray-200 flex items-center justify-between">
            <span>Tổng số Khoa & Bộ môn đã định danh:</span>
            <span className="font-bold text-gray-950">{data?.faculties?.totalFaculties || 0} khoa • {data?.faculties?.totalDepartments || 0} bộ môn</span>
          </div>
        </div>

        {/* Crawler Operations Telemetry */}
        <div className="bg-white border-2 border-gray-900 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-emerald-600" />
              <span>Hạ tầng Thu thập Tự động (Polite Crawler)</span>
            </h3>
            <button
              onClick={() => onNavigate("crawler")}
              className="text-[11px] font-bold uppercase text-[#e03a3e] hover:underline"
            >
              Quản lý chi tiết &rarr;
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 bg-blue-50 border border-blue-200">
              <div className="text-[10px] font-bold uppercase text-blue-700">Đang chờ</div>
              <div className="text-xl font-black text-blue-950 mt-0.5">{data?.crawler?.queued || 0}</div>
            </div>
            <div className="p-2.5 bg-amber-50 border border-amber-200">
              <div className="text-[10px] font-bold uppercase text-amber-700">Đang chạy</div>
              <div className="text-xl font-black text-amber-950 mt-0.5">{data?.crawler?.running || 0}</div>
            </div>
            <div className="p-2.5 bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] font-bold uppercase text-emerald-700">Thành công</div>
              <div className="text-xl font-black text-emerald-950 mt-0.5">{data?.crawler?.completed || 0}</div>
            </div>
            <div className="p-2.5 bg-red-50 border border-red-200">
              <div className="text-[10px] font-bold uppercase text-red-700">Thất bại</div>
              <div className="text-xl font-black text-red-950 mt-0.5">{data?.crawler?.failed || 0}</div>
            </div>
          </div>

          <div className="text-[11px] text-gray-500">
            Tuân thủ chính sách robots.txt của cổng thông tin `.edu.vn` với giới hạn 1.5s giãn cách và cơ chế thử lại lũy thừa.
          </div>
        </div>
      </div>

      {/* Recent Activity & Logs Feed */}
      <div className="bg-white border-2 border-gray-900 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-700" />
            <span>Nhật ký Thao tác Quản trị Gần nhất</span>
          </h3>
          <button
            onClick={() => onNavigate("audit")}
            className="text-[11px] font-bold uppercase text-[#e03a3e] hover:underline"
          >
            Xem toàn bộ nhật ký &rarr;
          </button>
        </div>

        {data?.recentActivity && data.recentActivity.length > 0 ? (
          <div className="divide-y divide-gray-100 text-xs">
            {data.recentActivity.map((act) => (
              <div key={act.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-gray-100 text-[10px] font-mono font-bold uppercase text-gray-800">
                    {act.action}
                  </span>
                  <span className="text-gray-900 font-semibold">{act.reason || act.targetType}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  <span className="font-mono">{act.actor}</span>
                  <span>{new Date(act.createdAt).toLocaleString("vi-VN")}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-gray-500">
            Chưa có thao tác quản trị mới nào được ghi nhận.
          </div>
        )}
      </div>
    </div>
  );
}
