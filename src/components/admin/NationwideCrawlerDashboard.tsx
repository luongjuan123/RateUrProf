"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Globe2,
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  Download,
  Building2,
  Cpu,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface CrawlerStats {
  totalInstitutions: number;
  completeInstitutions: number;
  partialInstitutions: number;
  nationwideCoverageScore: number;
  totalProfessors: number;
  totalJobs: number;
  stagedCount: number;
  activeCampaigns: number;
}

interface Campaign {
  id: string;
  name: string;
  scope: string;
  status: "pending" | "running" | "paused" | "completed" | "cancelled" | "failed";
  createdAt: number;
  totalInstitutions: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  extractedRecords: number;
  validatedRecords: number;
}

interface Institution {
  id: string;
  name: string;
  shortName: string;
  region: string;
  officialDomain: string;
  crawlStatus: "pending" | "complete" | "completed" | "partial" | "inaccessible" | "no_public_data";
  extractedProfessors: number;
  validatedRecords: number;
  totalProfessors?: number;
  lastSuccessfulCrawl?: number;
  lastErrorMessage?: string;
}

export function NationwideCrawlerDashboard() {
  const [stats, setStats] = useState<CrawlerStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [commandInput, setCommandInput] = useState("");
  const [commandLoading, setCommandLoading] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, campaignsRes, instsRes] = await Promise.all([
        fetch("/api/admin/crawler/overview"),
        fetch("/api/admin/crawler/campaigns"),
        fetch("/api/admin/crawler/institutions"),
      ]);

      const [overviewData, campaignsData, instsData] = await Promise.all([
        overviewRes.json(),
        campaignsRes.json(),
        instsRes.json(),
      ]);

      if (overviewData.success) setStats(overviewData.stats);
      if (campaignsData.success) setCampaigns(campaignsData.campaigns);
      if (instsData.success) setInstitutions(instsData.institutions);
    } catch (err) {
      console.error("Failed to load crawler dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleExecuteCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim()) return;

    setCommandLoading(true);
    setCommandFeedback(null);
    try {
      const res = await fetch("/api/admin/crawler/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: commandInput.trim() }),
      });
      const data = await res.json();
      setCommandFeedback(data.feedbackMessage);
      setCommandInput("");
      await fetchData();
    } catch {
      setCommandFeedback("Lỗi khi thực thi lệnh.");
    } finally {
      setCommandLoading(false);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: "start" | "pause" | "cancel") => {
    setActionLoading(`${campaignId}-${action}`);
    try {
      await fetch(`/api/admin/crawler/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await fetchData();
    } catch (err) {
      console.error("Campaign action error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerTick = async () => {
    setActionLoading("tick");
    try {
      const res = await fetch("/api/admin/crawler/worker/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 10 }),
      });
      const data = await res.json();
      setCommandFeedback(`Worker đã xử lý ${data.processedCount} tác vụ (${data.succeededCount} thành công, ${data.failedCount} thất bại).`);
      await fetchData();
    } catch {
      setCommandFeedback("Lỗi khi kích hoạt worker tick.");
    } finally {
      setActionLoading(null);
    }
  };

  const normalizeRegion = (r?: string) => {
    if (!r) return "South";
    if (r === "North" || r.toLowerCase().includes("bắc")) return "North";
    if (r === "Central" || r.toLowerCase().includes("trung")) return "Central";
    return "South";
  };

  const filteredInstitutions = institutions.filter((inst) => {
    if (filterRegion !== "all" && normalizeRegion(inst.region) !== filterRegion) return false;
    const instStatus =
      inst.crawlStatus === "complete" || inst.crawlStatus === "completed"
        ? "complete"
        : inst.crawlStatus === "partial"
        ? "partial"
        : inst.crawlStatus === "inaccessible"
        ? "inaccessible"
        : "pending";
    if (filterStatus !== "all" && instStatus !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inst.name.toLowerCase().includes(q) ||
        inst.shortName.toLowerCase().includes(q) ||
        inst.officialDomain.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading && !stats) {
    return (
      <div className="p-12 text-center text-sm font-semibold text-gray-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-red-600" />
        Đang tải bảng điều khiển Crawler Toàn quốc...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Coverage Card */}
        <div className="bg-white border border-gray-200 p-5 rounded-none shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            <span>Độ phủ Toàn quốc</span>
            <Globe2 className="w-4 h-4 text-[#e03a3e]" />
          </div>
          <div className="text-3xl font-black text-black">
            {stats?.nationwideCoverageScore || 0}%
          </div>
          <div className="w-full bg-gray-100 h-2 mt-3 rounded-none border border-black overflow-hidden">
            <div
              className="bg-[#e03a3e] h-full transition-all duration-500"
              style={{ width: `${stats?.nationwideCoverageScore || 0}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            {stats?.completeInstitutions || 0} trường hoàn chỉnh • {stats?.partialInstitutions || 0} trường một phần
          </p>
        </div>

        {/* Institutions Card */}
        <div className="bg-white border border-gray-200 p-5 rounded-none shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            <span>Trường Đại học Đã Đăng ký</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-black">
            {stats?.totalInstitutions || 0}
          </div>
          <p className="text-[11px] text-gray-500 mt-3">
            Bắc, Trung, Nam &amp; Viện nghiên cứu đào tạo
          </p>
        </div>

        {/* Professors Extracted Card */}
        <div className="bg-white border border-gray-200 p-5 rounded-none shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            <span>Hồ sơ Giảng viên Đã Xác thực</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-700">
            {stats?.totalProfessors.toLocaleString("vi-VN") || 0}
          </div>
          <p className="text-[11px] text-gray-500 mt-3">
            Đã đồng bộ vào cơ sở dữ liệu sản xuất
          </p>
        </div>

        {/* Jobs & Staging Card */}
        <div className="bg-white border border-gray-200 p-5 rounded-none shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            <span>Tác vụ Cào &amp; Staging</span>
            <Cpu className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-black">
            {stats?.totalJobs || 0}
          </div>
          <p className="text-[11px] text-gray-500 mt-3">
            {stats?.activeCampaigns || 0} chiến dịch đang chạy • {stats?.stagedCount || 0} bản ghi chờ duyệt
          </p>
        </div>
      </div>

      {/* 2. NATURAL LANGUAGE COMMAND BAR & QUICK ACTIONS */}
      <div className="bg-black text-white p-5 rounded-none shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-400 mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Bảng điều khiển Lệnh Tự động hóa (Natural Language Crawler Command)</span>
        </div>
        <form onSubmit={handleExecuteCommand} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Nhập lệnh điều khiển crawler..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 text-sm outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-red-500"
            />
          </div>
          <button
            type="submit"
            disabled={commandLoading}
            className="px-6 py-3 bg-[#e03a3e] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
          >
            {commandLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Thực thi Lệnh</span>
          </button>
        </form>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-800 text-xs">
          <span className="text-gray-400 font-bold uppercase text-[10px]">Tác vụ nhanh:</span>
          <button
            onClick={() => {
              setCommandInput("Thu thập toàn quốc");
              handleExecuteCommand();
            }}
            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-[11px]"
          >
            + Thu thập Toàn quốc
          </button>
          <button
            onClick={() => {
              setCommandInput("Kiểm tra độ phủ");
              handleExecuteCommand();
            }}
            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-[11px]"
          >
            📊 Audit Độ phủ Toàn quốc
          </button>
          <button
            onClick={handleTriggerTick}
            disabled={actionLoading === "tick"}
            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-[11px] flex items-center gap-1"
          >
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span>Kích hoạt Worker Tick</span>
          </button>
          <a
            href="/api/admin/crawler/export?format=csv"
            download
            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-[11px] flex items-center gap-1 ml-auto"
          >
            <Download className="w-3 h-3 text-blue-400" />
            <span>Xuất Danh bạ (CSV)</span>
          </a>
        </div>

        {commandFeedback && (
          <div className="mt-4 p-3 bg-gray-900 border border-red-500/50 text-xs text-red-200 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>{commandFeedback}</div>
          </div>
        )}
      </div>

      {/* 3. CAMPAIGNS PROGRESS & MONITORING */}
      <div className="bg-white border border-gray-200 rounded-none shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#e03a3e]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-black">
              Chiến dịch Cào Dữ liệu ({campaigns.length})
            </h3>
          </div>
          <button
            onClick={fetchData}
            className="text-xs text-gray-500 hover:text-black flex items-center gap-1 font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Chưa có chiến dịch nào được khởi tạo. Hãy nhập lệnh hoặc nhấn &quot;Thu thập Toàn quốc&quot;.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 overflow-x-auto">
            {campaigns.map((cmp) => {
              const progressPct = cmp.totalJobs > 0
                ? Math.round((cmp.completedJobs / cmp.totalJobs) * 100)
                : 0;

              return (
                <div key={cmp.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-[280px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-black">{cmp.name}</span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-none ${
                          cmp.status === "running"
                            ? "bg-emerald-100 text-emerald-800"
                            : cmp.status === "paused"
                            ? "bg-amber-100 text-amber-800"
                            : cmp.status === "completed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {cmp.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        Phạm vi: {cmp.scope.toUpperCase()}
                      </span>
                    </div>

                    <div className="w-full bg-gray-100 h-2 rounded-none border border-black overflow-hidden max-w-md">
                      <div
                        className="bg-[#e03a3e] h-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-gray-500 flex items-center gap-3">
                      <span>Tiến độ: {progressPct}% ({cmp.completedJobs}/{cmp.totalJobs} tác vụ)</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">{cmp.validatedRecords} hồ sơ xác thực</span>
                      <span>•</span>
                      <span className="text-red-600">{cmp.failedJobs} lỗi</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {cmp.status === "running" && (
                      <button
                        onClick={() => handleCampaignAction(cmp.id, "pause")}
                        disabled={actionLoading === `${cmp.id}-pause`}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Pause className="w-3.5 h-3.5" /> Tạm dừng
                      </button>
                    )}
                    {cmp.status === "paused" && (
                      <button
                        onClick={() => handleCampaignAction(cmp.id, "start")}
                        disabled={actionLoading === `${cmp.id}-start`}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" /> Tiếp tục
                      </button>
                    )}
                    {cmp.status !== "completed" && cmp.status !== "cancelled" && (
                      <button
                        onClick={() => handleCampaignAction(cmp.id, "cancel")}
                        disabled={actionLoading === `${cmp.id}-cancel`}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold flex items-center gap-1"
                      >
                        <StopCircle className="w-3.5 h-3.5 text-red-600" /> Hủy
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. INSTITUTIONS DRILLDOWN & AUDIT TABLE */}
      <div className="bg-white border border-gray-200 rounded-none shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                Danh mục Cơ sở Đào tạo &amp; Trạng thái Độ phủ ({filteredInstitutions.length}/{institutions.length})
              </h3>
              <p className="text-xs text-gray-500">
                Minh bạch trạng thái: Hoàn chỉnh, Một phần, Không có dữ liệu công khai, hoặc Bị chặn.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Tìm trường theo tên, viết tắt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-red-500 w-48 sm:w-64"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500 font-semibold text-[11px]">Khu vực:</span>
            {["all", "North", "Central", "South"].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRegion(r)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-none ${
                  filterRegion === r
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {r === "all" ? "Tất cả" : r === "North" ? "Miền Bắc" : r === "Central" ? "Miền Trung" : "Miền Nam"}
              </button>
            ))}

            <span className="text-gray-500 font-semibold text-[11px] ml-3">Trạng thái:</span>
            {["all", "complete", "partial", "pending", "inaccessible"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-none ${
                  filterStatus === s
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s === "all"
                  ? "Tất cả"
                  : s === "complete"
                  ? "Hoàn chỉnh"
                  : s === "partial"
                  ? "Một phần"
                  : s === "inaccessible"
                  ? "Không thể truy cập"
                  : "Chờ quét"}
              </button>
            ))}
          </div>
        </div>

        {/* Institutions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="p-3">Mã &amp; Viết tắt</th>
                <th className="p-3">Tên Cơ sở Đào tạo</th>
                <th className="p-3">Miền</th>
                <th className="p-3">Tên miền chính thức</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 text-right">Giảng viên Xác thực</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInstitutions.map((inst) => {
                const isComplete = inst.crawlStatus === "complete" || inst.crawlStatus === "completed";
                const statusBadge = isComplete ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-none text-[10px] flex items-center gap-1 w-max">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoàn chỉnh
                  </span>
                ) : inst.crawlStatus === "partial" ? (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-none text-[10px] flex items-center gap-1 w-max">
                    <Clock className="w-3 h-3 text-amber-600" /> Một phần
                  </span>
                ) : inst.crawlStatus === "inaccessible" ? (
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded-none text-[10px] flex items-center gap-1 w-max">
                    <XCircle className="w-3 h-3 text-red-600" /> Bị chặn / Lỗi mạng
                  </span>
                ) : inst.crawlStatus === "no_public_data" ? (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold rounded-none text-[10px] flex items-center gap-1 w-max">
                    <AlertTriangle className="w-3 h-3 text-gray-500" /> Không có dữ liệu mở
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 font-bold rounded-none text-[10px] w-max">
                    Chờ quét
                  </span>
                );

                return (
                  <tr key={inst.id} className="hover:bg-gray-50">
                    <td className="p-3 font-mono font-bold text-gray-800">{inst.shortName}</td>
                    <td className="p-3 font-medium text-black">
                      <div>{inst.name}</div>
                      {inst.lastErrorMessage && (
                        <div className="text-[10px] text-red-600 truncate max-w-xs">
                          {inst.lastErrorMessage}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-gray-600">
                      {normalizeRegion(inst.region) === "North" ? "Miền Bắc" : normalizeRegion(inst.region) === "Central" ? "Miền Trung" : "Miền Nam"}
                    </td>
                    <td className="p-3 font-mono text-gray-500">
                      <a
                        href={`https://${inst.officialDomain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        {inst.officialDomain}
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </a>
                    </td>
                    <td className="p-3">{statusBadge}</td>
                    <td className="p-3 text-right font-bold text-black">
                      {inst.validatedRecords || inst.totalProfessors || inst.extractedProfessors || 0}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedInst(inst)}
                        className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold text-[11px] inline-flex items-center gap-1"
                      >
                        Chi tiết <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. INSTITUTION AUDIT DETAIL MODAL */}
      {selectedInst && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-bold text-base text-black">{selectedInst.name}</h4>
                <p className="text-xs text-gray-500 font-mono">
                  {selectedInst.shortName} • {selectedInst.officialDomain}
                </p>
              </div>
              <button
                onClick={() => setSelectedInst(null)}
                className="text-gray-400 hover:text-black font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 p-3">
                <span className="text-gray-500 font-bold block">Trạng thái Thu thập</span>
                <span className="text-sm font-black text-black uppercase">
                  {selectedInst.crawlStatus}
                </span>
              </div>
              <div className="bg-gray-50 p-3">
                <span className="text-gray-500 font-bold block">Hồ sơ Giảng viên Đã xác thực</span>
                <span className="text-sm font-black text-emerald-700">
                  {selectedInst.validatedRecords || 0}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-gray-700">Kiểm tra Yêu cầu Độ phủ:</div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Xác thực tên miền giáo dục chính thức (.edu.vn)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Quét danh mục cán bộ &amp; phân khoa bộ môn</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Kiểm tra chính sách robots.txt và độ trễ lịch sự (Polite Crawling)</span>
              </div>
            </div>

            {selectedInst.lastErrorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700">
                <div className="font-bold">Lỗi gần nhất:</div>
                <div className="font-mono text-[11px] mt-1">{selectedInst.lastErrorMessage}</div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setSelectedInst(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-bold"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setCommandInput(`Thu thập giảng viên ${selectedInst.shortName}`);
                  setSelectedInst(null);
                  handleExecuteCommand();
                }}
                className="px-4 py-2 bg-[#e03a3e] hover:bg-red-700 text-white text-xs font-bold"
              >
                Cào ngay trường này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
