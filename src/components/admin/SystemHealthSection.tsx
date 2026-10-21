"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Server,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  RotateCw,
  Cpu,
  HardDrive,
  Clock,
  Layers,
  ShieldAlert,
} from "lucide-react";

interface HealthData {
  status: "operational" | "degraded";
  environment: string;
  gcp: {
    projectId: string;
    region: string;
    cloudRunService: string;
    gcsBucket: string;
  };
  database: {
    type: string;
    healthy: boolean;
    queryLatencyMs: number;
    tableCounts: Record<string, number>;
  };
  system: {
    uptimeSeconds: number;
    nodeVersion: string;
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
  timestamp: number;
}

export function SystemHealthSection() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/health");
      const json = await res.json();
      if (json.success) {
        setHealth(json);
      }
    } catch (err) {
      console.error("Health check error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hrs = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts = [];
    if (days > 0) parts.push(`${days} ngày`);
    if (hrs > 0) parts.push(`${hrs} giờ`);
    if (mins > 0) parts.push(`${mins} phút`);
    parts.push(`${secs} giây`);
    return parts.join(" ");
  };

  if (loading && !health) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <RotateCw className="w-8 h-8 animate-spin text-gray-900" />
        <span className="text-xs uppercase font-mono tracking-widest text-gray-500">
          Đang kết nối đo đạc sức khỏe hạ tầng đám mây...
        </span>
      </div>
    );
  }

  if (!loading && !health) {
    return (
      <div className="p-8 border-2 border-red-500 bg-red-50 text-red-950 flex flex-col items-center justify-center gap-3">
        <AlertTriangle className="w-8 h-8 text-red-600" />
        <p className="font-bold text-sm">Không thể kết nối để đo đạc sức khỏe hạ tầng hệ thống.</p>
        <button
          onClick={fetchHealth}
          className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const isOperational = health?.status === "operational" && !!health?.database?.healthy;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-gray-900">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-gray-950 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-900" />
            <span>Sức khỏe Hệ thống & Đo lường Hạ tầng (System Telemetry)</span>
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Giám sát độ trễ Cloud SQL, tài nguyên Node.js trên Cloud Run và trạng thái các bảng dữ liệu
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-gray-900 rounded-none border-gray-400 focus:ring-0"
            />
            <span>Tự làm mới (10s)</span>
          </label>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Đo lại</span>
          </button>
        </div>
      </div>

      {/* Main Status Banner */}
      <div
        className={`p-5 border-2 flex items-center justify-between gap-4 ${
          isOperational
            ? "bg-emerald-50 border-emerald-600 text-emerald-950"
            : "bg-red-50 border-red-600 text-red-950"
        }`}
      >
        <div className="flex items-center gap-3">
          {isOperational ? (
            <div className="relative">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            </div>
          ) : (
            <AlertTriangle className="w-8 h-8 text-red-600" />
          )}
          <div>
            <div className="text-base font-black uppercase tracking-wider">
              {isOperational ? "Tất cả Dịch vụ Hoạt động Bình thường (All Systems Operational)" : "Hệ thống Đang Bị Suy giảm Hiệu năng"}
            </div>
            <div className="text-xs text-gray-700 mt-0.5">
              Cơ sở dữ liệu: <span className="font-bold">{health?.database?.type || "N/A"}</span> • Độ trễ Ping:{" "}
              <span className="font-mono font-bold text-gray-950">{health?.database?.queryLatencyMs ?? "N/A"}ms</span> • Thời gian kiểm tra: {health ? new Date(health.timestamp).toLocaleTimeString("vi-VN") : ""}
            </div>
          </div>
        </div>

        <div className="hidden md:block font-mono text-xs uppercase px-3 py-1 bg-white/70 border border-current font-bold">
          {health?.environment}
        </div>
      </div>

      {/* 3 Infrastructure Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cloud Infrastructure */}
        <div className="bg-white border-2 border-gray-900 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-xs font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-600" />
              <span>Hạ tầng Google Cloud</span>
            </span>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 font-mono text-[10px] font-bold">GCP</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Dự án GCP:</span>
              <span className="font-mono font-bold text-gray-900">{health?.gcp?.projectId || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Khu vực (Region):</span>
              <span className="font-mono font-bold text-gray-900">{health?.gcp?.region || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Cloud Run Service:</span>
              <span className="font-mono font-bold text-gray-900">{health?.gcp?.cloudRunService || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Storage Bucket:</span>
              <span className="font-mono font-bold text-gray-900 truncate max-w-[150px]" title={health?.gcp?.gcsBucket || ""}>
                {health?.gcp?.gcsBucket || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Database Health */}
        <div className="bg-white border-2 border-gray-900 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-xs font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Cơ sở Dữ liệu</span>
            </span>
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 font-mono text-[10px] font-bold">PostgreSQL</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Loại kết nối:</span>
              <span className="font-semibold text-gray-900">{health?.database?.type || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Trạng thái kết nối:</span>
              <span className={`font-bold ${health?.database?.healthy ? "text-emerald-700" : "text-red-600"}`}>
                {health?.database?.healthy ? "Đang kết nối (OK)" : "Mất kết nối"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Độ trễ truy vấn (Ping):</span>
              <span className="font-mono font-bold text-gray-900">{health?.database?.queryLatencyMs ?? "N/A"} ms</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Khả năng chịu tải:</span>
              <span className="font-semibold text-emerald-700">Tối ưu (Connection Pooling)</span>
            </div>
          </div>
        </div>

        {/* Process & Node.js Runtime */}
        <div className="bg-white border-2 border-gray-900 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-xs font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              <span>Tiến trình Node.js</span>
            </span>
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 font-mono text-[10px] font-bold">{health?.system?.nodeVersion || "N/A"}</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Thời gian hoạt động (Uptime):</span>
              <span className="font-semibold text-gray-900">{health?.system?.uptimeSeconds ? formatUptime(health.system.uptimeSeconds) : "0"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Bộ nhớ Heap (Used / Total):</span>
              <span className="font-mono font-bold text-gray-900">
                {health?.system?.heapUsedMb ?? "0"} MB / {health?.system?.heapTotalMb ?? "0"} MB
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Resident Set Size (RSS):</span>
              <span className="font-mono font-bold text-gray-900">{health?.system?.rssMb ?? "0"} MB</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Framework:</span>
              <span className="font-semibold text-gray-900">Next.js 16 (App Router)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Table Records Breakdown */}
      <div className="bg-white border-2 border-gray-900 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-900" />
            <span>Thống kê Quy mô Bản ghi Các Bảng Dữ liệu Thực (Cloud SQL PostgreSQL)</span>
          </h3>
          <span className="text-[11px] font-mono text-gray-500">97K+ Giảng viên Toàn quốc</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {health?.database?.tableCounts &&
            Object.entries(health.database.tableCounts).map(([tableName, count]) => (
              <div key={tableName} className="p-3 bg-gray-50 border border-gray-200 space-y-1">
                <div className="text-[10px] font-mono font-bold uppercase text-gray-500 truncate" title={tableName}>
                  {tableName}
                </div>
                <div className="text-xl font-black text-gray-950 font-mono">
                  {count.toLocaleString("vi-VN")}
                </div>
                <div className="text-[10px] text-gray-400">bản ghi thực tế</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
