"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  RotateCw,
  Eye,
  Shield,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Activity,
  Globe,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  beforeState: unknown;
  afterState: unknown;
  ipAddress: string | null;
  createdAt: number;
}

export function AuditLogsSection() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");

  // Inspect Modal
  const [inspectLog, setInspectLog] = useState<AuditLogEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.set("search", search);
      if (actorEmail) params.set("actorEmail", actorEmail);
      if (action) params.set("action", action);
      if (targetType) params.set("targetType", targetType);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.logs || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, actorEmail, action, targetType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const resetFilters = () => {
    setSearch("");
    setActorEmail("");
    setAction("");
    setTargetType("");
    setPage(1);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">Super Admin</span>;
      case "admin":
        return <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">Admin</span>;
      case "moderator":
        return <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300">Mod</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-300">{role}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-gray-900">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-gray-950 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-900" />
            <span>Nhật ký Kiểm toán Hệ thống (Audit Logs)</span>
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Ghi chép bất biến (append-only) toàn bộ các thay đổi quyền lực, hợp nhất dữ liệu và can thiệp hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <form onSubmit={handleSearchSubmit} className="bg-white border-2 border-gray-900 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Bộ lọc Truy vấn Kiểm toán</span>
          </span>
          {(search || actorEmail || action || targetType) && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] font-bold text-[#e03a3e] hover:underline"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo lý do, target ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 focus:border-gray-900 focus:outline-none"
            />
          </div>

          {/* Actor Email */}
          <div className="relative">
            <User className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Email người thực hiện..."
              value={actorEmail}
              onChange={(e) => setActorEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 focus:border-gray-900 focus:outline-none"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-gray-300 focus:border-gray-900 focus:outline-none bg-white"
            >
              <option value="">-- Tất cả hành động --</option>
              <option value="users.update_role">Thay đổi vai trò (Role)</option>
              <option value="users.update_status">Khóa/mở khóa tài khoản</option>
              <option value="lecturers.update">Chỉnh sửa giảng viên</option>
              <option value="university.update">Chỉnh sửa trường đại học</option>
              <option value="university.merge">Hợp nhất trường (Merge Duplicate)</option>
              <option value="moderation.status">Duyệt/ẩn đánh giá</option>
              <option value="settings.update">Cập nhật cấu hình hệ thống</option>
            </select>
          </div>

          {/* Target Type Filter */}
          <div>
            <select
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-gray-300 focus:border-gray-900 focus:outline-none bg-white"
            >
              <option value="">-- Tất cả đối tượng --</option>
              <option value="user">Người dùng (User)</option>
              <option value="lecturer">Giảng viên (Lecturer)</option>
              <option value="university">Đại học (University)</option>
              <option value="review">Đánh giá (Review)</option>
              <option value="setting">Cấu hình (Setting)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-4 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase transition-colors"
          >
            Áp dụng bộ lọc
          </button>
        </div>
      </form>

      {/* Logs Table */}
      <div className="bg-white border-2 border-gray-900 shadow-sm overflow-hidden">
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs">
          <span className="font-bold text-gray-700">
            Tìm thấy <span className="font-mono text-gray-950 font-black">{total.toLocaleString("vi-VN")}</span> bản ghi kiểm toán
          </span>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 text-xs border border-gray-300 bg-white"
            >
              <option value={15}>15 dòng</option>
              <option value={25}>25 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <RotateCw className="w-6 h-6 animate-spin text-gray-900" />
            <span className="text-xs uppercase font-mono tracking-wider text-gray-500">
              Đang tải danh sách kiểm toán...
            </span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">
            Không tìm thấy bản ghi kiểm toán nào phù hợp với điều kiện lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider text-[10px] border-b border-gray-300">
                <tr>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Người thực hiện</th>
                  <th className="py-2.5 px-3">Hành động</th>
                  <th className="py-2.5 px-3">Đối tượng</th>
                  <th className="py-2.5 px-3">Lý do / Nội dung</th>
                  <th className="py-2.5 px-3">IP</th>
                  <th className="py-2.5 px-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-gray-600">
                      {new Date(log.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{log.actorEmail}</div>
                      <div className="mt-0.5">{getRoleBadge(log.actorRole)}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-gray-100 border border-gray-300 font-mono text-[11px] font-bold text-gray-900">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-gray-900 font-semibold">{log.targetType}</span>
                      {log.targetId && (
                        <div className="text-[10px] font-mono text-gray-500 truncate max-w-[140px]">
                          {log.targetId}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-[260px] truncate text-gray-700">
                      {log.reason || "—"}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-gray-500">
                      {log.ipAddress || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setInspectLog(log)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-900 text-[11px] font-bold uppercase transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Xem Diff</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
          <span className="text-gray-600">
            Trang <span className="font-bold text-gray-950">{page}</span> / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail State Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border-2 border-gray-900 max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b-2 border-gray-900">
              <div>
                <h3 className="text-base font-black uppercase text-gray-950 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#e03a3e]" />
                  <span>Chi tiết Nhật ký Kiểm toán #{inspectLog.id.slice(0, 8)}</span>
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Thực hiện bởi <span className="font-semibold text-gray-900">{inspectLog.actorEmail}</span> ({inspectLog.actorRole}) lúc {new Date(inspectLog.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="p-1 text-gray-500 hover:text-gray-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 border border-gray-200">
              <div>
                <span className="text-gray-500 font-bold uppercase text-[10px]">Hành động:</span>
                <div className="font-mono font-bold text-gray-950">{inspectLog.action}</div>
              </div>
              <div>
                <span className="text-gray-500 font-bold uppercase text-[10px]">Đối tượng:</span>
                <div className="font-mono text-gray-950">{inspectLog.targetType} ({inspectLog.targetId || "N/A"})</div>
              </div>
              <div>
                <span className="text-gray-500 font-bold uppercase text-[10px]">Địa chỉ IP:</span>
                <div className="font-mono text-gray-950">{inspectLog.ipAddress || "Không xác định"}</div>
              </div>
              <div>
                <span className="text-gray-500 font-bold uppercase text-[10px]">Lý do thực hiện:</span>
                <div className="text-gray-950">{inspectLog.reason || "Không ghi chú"}</div>
              </div>
            </div>

            {/* Before vs After States */}
            <div className="space-y-3">
              <div>
                <div className="text-xs font-bold uppercase text-gray-700 mb-1">
                  Trạng thái Trước thay đổi (Before State):
                </div>
                <pre className="p-3 bg-gray-950 text-gray-100 text-[11px] font-mono overflow-x-auto max-h-48 border border-gray-800">
                  {inspectLog.beforeState ? JSON.stringify(inspectLog.beforeState, null, 2) : "null"}
                </pre>
              </div>

              <div>
                <div className="text-xs font-bold uppercase text-gray-700 mb-1">
                  Trạng thái Sau thay đổi (After State):
                </div>
                <pre className="p-3 bg-gray-950 text-emerald-400 text-[11px] font-mono overflow-x-auto max-h-48 border border-gray-800">
                  {inspectLog.afterState ? JSON.stringify(inspectLog.afterState, null, 2) : "null"}
                </pre>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 bg-gray-900 text-white text-xs font-bold uppercase hover:bg-black transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
