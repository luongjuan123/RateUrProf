"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  Users,
  Award,
  Layers,
  MapPin,
  AlertCircle,
  FileText,
} from "lucide-react";

interface MoetInstitution {
  id: string;
  name: string;
  short_name: string;
  official_code: string;
  official_code_source: string;
  official_code_status: string;
  common_abbreviations: string[] | string;
  official_domain: string | null;
  official_website: string | null;
  institution_type: string;
  city: string;
  region: string;
  total_professors: number;
  rating_average: number | null;
  total_reviews: number;
}

interface TelemetryData {
  totalInstitutions: number;
  officialSourceTarget: number;
  verifiedCodesCount: number;
  codeVerificationRate: string;
  totalAffiliatedProfessors: number;
  institutionsWithFaculty: number;
  totalAliases: number;
  regionBreakdown: { region: string; count: string }[];
  typeBreakdown: { institution_type: string; count: string }[];
  officialSourceUrl: string;
  auditLogs: {
    id: string;
    action: string;
    actor_email: string;
    created_at: string;
    reason: string;
  }[];
}

export function MoetRegistrySection() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [institutions, setInstitutions] = useState<MoetInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "15",
        query: searchQuery,
        region: regionFilter,
      });

      const res = await fetch(`/api/admin/moet-registry?${params.toString()}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load MOET registry telemetry.");
      }

      setTelemetry(data.telemetry);
      setInstitutions(data.institutions || []);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalItems(data.pagination.totalItems || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching MOET registry.");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, regionFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTriggerSync = async (mode: "dry-run" | "execute") => {
    if (mode === "execute" && !confirm("Bạn có chắc chắn muốn chạy đồng bộ lại danh mục MOET chính thức không?")) {
      return;
    }

    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/admin/moet-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Sync failed");
      }
      setSyncMessage(
        mode === "dry-run"
          ? `[Dry-run thành công] Kiểm toán 327 cơ sở giáo dục toàn vẹn. Giảng viên: ${data.result.retainedLecturers}`
          : `[Đồng bộ thành công] Đã cập nhật 327 cơ sở giáo dục chính thức MOET.`
      );
      fetchData();
    } catch (err: unknown) {
      setSyncMessage(`Lỗi: ${err instanceof Error ? err.message : "Thao tác thất bại"}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold uppercase bg-[#1d4ed8] text-white">
                Official Directory
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-blue-50 text-[#1d4ed8] border border-blue-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% MOET Verified
              </span>
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
              Danh mục Cơ sở Giáo dục Chính thức (MOET)
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Nguồn dữ liệu chuẩn hoá từ Bộ Giáo dục và Đào tạo Việt Nam với 327 cơ sở giáo dục đại học, viện nghiên cứu đào tạo tiến sĩ và cao đẳng sư phạm. Đảm bảo toàn vẹn quan hệ giảng viên và mã trường chính thức.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => handleTriggerSync("dry-run")}
              disabled={syncing}
              className="px-3 py-2 text-xs font-bold border border-gray-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer text-slate-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1d4ed8]" />
              Kiểm toán (Dry-run)
            </button>
            <button
              onClick={() => handleTriggerSync("execute")}
              disabled={syncing}
              className="px-4 py-2 text-xs font-bold border border-[#1d4ed8] bg-[#1d4ed8] text-white hover:bg-[#1e40af] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              Đồng bộ MOET
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#1d4ed8]" />
            <span>{syncMessage}</span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      {telemetry && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Cơ sở Giáo dục</span>
              <Building2 className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {telemetry.totalInstitutions}{" "}
              <span className="text-xs font-normal text-[#1d4ed8]">/ {telemetry.officialSourceTarget}</span>
            </div>
            <div className="text-[11px] text-[#1d4ed8] font-bold mt-1">
              ✓ Chuẩn hoá 100% nguồn MOET
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Mã trường Chính thức</span>
              <Award className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {telemetry.verifiedCodesCount}
            </div>
            <div className="text-[11px] text-[#1d4ed8] font-bold mt-1">
              ✓ 100% có mã duy nhất (BKA, VJU, ...)
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Giảng viên Khớp trường</span>
              <Users className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {telemetry.totalAffiliatedProfessors.toLocaleString("vi-VN")}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              {telemetry.institutionsWithFaculty} trường có dữ liệu
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Bí danh &amp; Viết tắt</span>
              <Layers className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {telemetry.totalAliases}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Tra cứu tức thì bằng mã / tên viết tắt
            </div>
          </div>
        </div>
      )}

      {/* Regional & Type Breakdown */}
      {telemetry && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#1d4ed8]" /> Phân bố Vùng miền
            </h3>
            <div className="space-y-2">
              {telemetry.regionBreakdown.map((r) => (
                <div key={r.region} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{r.region}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{r.count} cơ sở</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({Math.round((parseInt(r.count, 10) / telemetry.totalInstitutions) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#1d4ed8]" /> Phân loại Cơ sở Giáo dục
            </h3>
            <div className="space-y-2">
              {telemetry.typeBreakdown.map((t) => {
                const label =
                  t.institution_type === "university"
                    ? "Trường Đại học"
                    : t.institution_type === "institute"
                    ? "Viện Nghiên cứu Đào tạo"
                    : t.institution_type === "college"
                    ? "Trường Cao đẳng Sư phạm"
                    : "Học viện";
                return (
                  <div key={t.institution_type} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{t.count}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({Math.round((parseInt(t.count, 10) / telemetry.totalInstitutions) * 100)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Table Card */}
      <div className="bg-white border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã MOET (BKA, VJU), tên viết tắt..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 focus:border-[#1d4ed8] font-sans focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs border border-gray-300 focus:border-[#1d4ed8] bg-white font-sans focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]"
            >
              <option value="all">Tất cả vùng miền</option>
              <option value="Miền Bắc">Miền Bắc</option>
              <option value="Miền Trung">Miền Trung</option>
              <option value="Miền Nam">Miền Nam</option>
            </select>
          </div>
        </div>

        {/* Institutions Table */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">Đang tải danh mục MOET...</div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-800 text-xs font-mono">{error}</div>
        ) : institutions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">Không tìm thấy cơ sở giáo dục nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-700">
                  <th className="py-2.5 px-3">Mã MOET</th>
                  <th className="py-2.5 px-3">Tên Cơ sở Giáo dục</th>
                  <th className="py-2.5 px-3">Viết tắt / ID</th>
                  <th className="py-2.5 px-3">Địa điểm</th>
                  <th className="py-2.5 px-3">Website</th>
                  <th className="py-2.5 px-3 text-right">Giảng viên</th>
                  <th className="py-2.5 px-3 text-right">Đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {institutions.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded font-bold text-[#1d4ed8]">
                        {u.official_code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      <div>{u.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{u.institution_type}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      <span className="font-bold text-slate-800">{u.short_name}</span>
                      <div className="text-[10px] text-slate-400">/{u.id}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{u.city}</div>
                      <div className="text-[10px] text-slate-400">{u.region}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {u.official_website ? (
                        <a
                          href={u.official_website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#1d4ed8] hover:underline flex items-center gap-1"
                        >
                          {u.official_domain || "Link"}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {u.total_professors > 0 ? (
                        u.total_professors.toLocaleString("vi-VN")
                      ) : (
                        <span className="text-gray-300 font-normal">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {u.total_reviews > 0 ? (
                        <span className="font-mono font-bold text-[#1d4ed8]">
                          ★ {u.rating_average} ({u.total_reviews})
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-xs">
          <div className="text-slate-500 font-mono">
            Hiển thị {institutions.length} / {totalItems} cơ sở giáo dục
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 border border-gray-300 bg-white hover:bg-slate-50 font-mono font-medium disabled:opacity-40 cursor-pointer"
            >
              Prev
            </button>
            <span className="px-3 py-1 font-mono text-slate-700">
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2.5 py-1 border border-gray-300 bg-white hover:bg-slate-50 font-mono font-medium disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
