"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Trash2,
  RotateCw,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
  Check,
  CheckSquare,
  Square,
  MinusSquare,
  AlertOctagon,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string | null;
  displayName: string;
  photoUrl: string | null;
  role: "student" | "moderator" | "admin" | "super_admin" | "support" | "security";
  status: "active" | "suspended" | "locked" | "pending_deletion" | "deleted";
  lockReason?: string | null;
  lockedAt?: number | null;
  deletionRequestedAt?: number | null;
  deletionScheduledAt?: number | null;
  cohort?: string;
  school?: string;
  fieldOfStudy?: string;
  expectedGraduationYear?: string;
  reviewCount: number;
  createdAt: number;
  lastLoginAt: number | null;
}

const CANONICAL_SUPER_ADMIN = "dungpubgame@gmail.com";

export function UsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Tickbox selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Single User Action State
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<"role" | "temporary_delete" | "permanent_delete" | "restore" | null>(null);
  const [newRole, setNewRole] = useState<string>("student");
  const [confirmPermanentText, setConfirmPermanentText] = useState("");

  // Batch Action State
  const [batchAction, setBatchAction] = useState<"temporary_delete" | "permanent_delete" | "restore" | null>(null);
  const [batchConfirmPermanentText, setBatchConfirmPermanentText] = useState("");

  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "15",
      });
      if (search.trim()) params.append("search", search.trim());
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.items || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Tickbox helpers
  const selectableUsers = useMemo(() => {
    return users.filter((u) => u.email?.trim().toLowerCase() !== CANONICAL_SUPER_ADMIN);
  }, [users]);

  const allPageSelected = useMemo(() => {
    return (
      selectableUsers.length > 0 &&
      selectableUsers.every((u) => selectedUserIds.has(u.id))
    );
  }, [selectableUsers, selectedUserIds]);

  const somePageSelected = useMemo(() => {
    return (
      selectableUsers.some((u) => selectedUserIds.has(u.id)) && !allPageSelected
    );
  }, [selectableUsers, selectedUserIds, allPageSelected]);

  const toggleSelectAllPage = () => {
    const next = new Set(selectedUserIds);
    if (allPageSelected) {
      selectableUsers.forEach((u) => next.delete(u.id));
    } else {
      selectableUsers.forEach((u) => next.add(u.id));
    }
    setSelectedUserIds(next);
  };

  const toggleSelectUser = (userId: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    setSelectedUserIds(next);
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
  };

  // Execute Single User Action
  const handleApplySingleAction = async () => {
    if (!selectedUser || !actionType) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      if (actionType === "role") {
        const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: newRole,
            reason: actionReason || "Thay đổi vai trò người dùng",
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Thao tác không thành công.");
        setFeedback({
          type: "success",
          message: `Đã phân quyền thành công tài khoản ${selectedUser.email || selectedUser.id}.`,
        });
      } else if (actionType === "restore") {
        const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "active",
            reason: actionReason || "Khôi phục và mở khóa tài khoản",
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Thao tác không thành công.");
        setFeedback({
          type: "success",
          message: `Đã mở khóa tài khoản ${selectedUser.email || selectedUser.id} và khôi phục các bài đánh giá.`,
        });
      } else if (actionType === "temporary_delete") {
        const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permanent: false,
            reason: actionReason || "Tạm xóa / Khóa tài khoản và ẩn bài đánh giá",
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Thao tác không thành công.");
        setFeedback({
          type: "success",
          message: data.message || `Đã tạm xóa tài khoản ${selectedUser.email || selectedUser.id}.`,
        });
      } else if (actionType === "permanent_delete") {
        const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permanent: true,
            reason: actionReason || "Xóa vĩnh viễn tài khoản và toàn bộ bài đánh giá",
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Thao tác không thành công.");
        setFeedback({
          type: "success",
          message: data.message || `Đã xóa vĩnh viễn tài khoản ${selectedUser.email || selectedUser.id}.`,
        });
      }

      // Close modal & reset state
      setSelectedUser(null);
      setActionType(null);
      setActionReason("");
      setConfirmPermanentText("");
      // Remove from selected set if present
      if (selectedUserIds.has(selectedUser.id)) {
        const next = new Set(selectedUserIds);
        next.delete(selectedUser.id);
        setSelectedUserIds(next);
      }
      await fetchUsers();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Đã xảy ra lỗi thực thi.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Batch Action
  const handleApplyBatchAction = async () => {
    if (!batchAction || selectedUserIds.size === 0) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/users/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          action: batchAction,
          reason: actionReason || `Thao tác hàng loạt (${batchAction}) từ Bảng điều khiển Quản trị`,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Lỗi xử lý hàng loạt.");

      const msg = `Thành công xử lý ${data.affectedCount} tài khoản${
        data.skippedCount > 0 ? ` (Bỏ qua ${data.skippedCount} tài khoản không hợp lệ)` : ""
      }.`;
      setFeedback({ type: "success", message: msg });

      setBatchAction(null);
      setActionReason("");
      setBatchConfirmPermanentText("");
      clearSelection();
      await fetchUsers();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Đã xảy ra lỗi xử lý hàng loạt.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-red-100 text-red-900 border border-red-300">Super Admin</span>;
      case "admin":
        return <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300">Admin</span>;
      case "moderator":
        return <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-300">Moderator</span>;
      case "support":
        return <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">Support Team</span>;
      case "security":
        return <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-red-100 text-red-900 border border-red-300">Security Team</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-gray-100 text-gray-700 border border-gray-200">Sinh viên</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-gray-900">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-gray-950 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Quản lý Tài khoản & Phân quyền Người dùng</span>
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Tổng số {totalCount.toLocaleString("vi-VN")} tài khoản sinh viên và quản trị viên đã đăng ký
          </p>
        </div>
        <button
          onClick={() => {
            fetchUsers();
          }}
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

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white border-2 border-gray-900 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên hiển thị, email hoặc mã ID sinh viên..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 focus:outline-none focus:border-black"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-gray-300 bg-white font-medium focus:outline-none focus:border-black"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="student">Sinh viên (User)</option>
            <option value="moderator">Kiểm duyệt viên (Moderator)</option>
            <option value="support">Chuyên viên Hỗ trợ (Support Team)</option>
            <option value="security">Chuyên viên An ninh (Security Team)</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="super_admin">Quản trị tối cao (Super Admin)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-gray-300 bg-white font-medium focus:outline-none focus:border-black"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="suspended">Đã tạm khóa / Tạm xóa</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when >= 1 user checked) */}
      {selectedUserIds.size > 0 && (
        <div className="p-3.5 bg-gray-950 text-white border-2 border-black flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-[11px] font-black">
              {selectedUserIds.size}
            </span>
            <span className="text-xs font-bold uppercase tracking-wide">
              Đã chọn {selectedUserIds.size} tài khoản
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setBatchAction("temporary_delete");
                setActionReason("");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-gray-950 text-[11px] font-black uppercase transition-colors"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Tạm xóa / Khóa (Ẩn đánh giá)</span>
            </button>

            <button
              onClick={() => {
                setBatchAction("restore");
                setActionReason("");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Mở khóa / Khôi phục</span>
            </button>

            <button
              onClick={() => {
                setBatchAction("permanent_delete");
                setActionReason("");
                setBatchConfirmPermanentText("");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa vĩnh viễn</span>
            </button>

            <button
              onClick={clearSelection}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-bold uppercase transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Bỏ chọn</span>
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border-2 border-gray-900 overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b-2 border-gray-900">
            <tr>
              {/* Master Tickbox Header */}
              <th className="p-3 w-10 text-center border-r border-gray-200">
                <button
                  type="button"
                  onClick={toggleSelectAllPage}
                  title={allPageSelected ? "Bỏ chọn tất cả" : "Chọn tất cả trang này"}
                  className="p-0.5 hover:text-black transition-colors"
                >
                  {allPageSelected ? (
                    <CheckSquare className="w-4 h-4 text-purple-600" />
                  ) : somePageSelected ? (
                    <MinusSquare className="w-4 h-4 text-purple-600" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </th>
              <th className="p-3 border-r border-gray-200">Tài khoản & Email</th>
              <th className="p-3 border-r border-gray-200">Vai trò</th>
              <th className="p-3 border-r border-gray-200">Trạng thái</th>
              <th className="p-3 border-r border-gray-200">Đánh giá</th>
              <th className="p-3 border-r border-gray-200">Ngày đăng ký</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-sans">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-gray-500 font-mono">
                  <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-900" />
                  Đang tải danh sách người dùng...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-gray-500 font-mono">
                  Không tìm thấy tài khoản người dùng nào khớp với bộ lọc.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSuperCanonical = u.email?.trim().toLowerCase() === CANONICAL_SUPER_ADMIN;
                const isSelected = selectedUserIds.has(u.id);

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      isSelected ? "bg-purple-50/70" : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Row Tickbox */}
                    <td className="p-3 text-center border-r border-gray-100">
                      {isSuperCanonical ? (
                        <span title="Tài khoản Quản trị viên Tối cao không thể chọn để xóa hoặc khóa">
                          <Shield className="w-4 h-4 text-red-400 mx-auto opacity-50 cursor-not-allowed" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleSelectUser(u.id)}
                          className="p-0.5 hover:text-black transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300 hover:text-gray-600" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="p-3 border-r border-gray-100">
                      <div className="font-bold text-gray-950 flex items-center gap-1.5">
                        <span>{u.displayName}</span>
                        {isSuperCanonical && (
                          <span className="px-1.5 py-0.2 text-[9px] font-black uppercase bg-red-600 text-white rounded">
                            Bảo vệ
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-gray-500">
                        {u.email || "Đăng nhập ẩn danh / Chưa liên kết email"}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400 mt-0.5">{u.id}</div>
                    </td>
                    <td className="p-3 border-r border-gray-100">{getRoleBadge(u.role)}</td>
                    <td className="p-3 border-r border-gray-100">
                      {u.status === "suspended" || u.status === "locked" ? (
                        <div>
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200">
                            Đã khóa tài khoản
                          </span>
                          {u.lockReason && (
                            <div className="text-[10px] text-red-800 font-medium truncate max-w-[140px] mt-0.5" title={u.lockReason}>
                              {u.lockReason}
                            </div>
                          )}
                        </div>
                      ) : u.status === "pending_deletion" ? (
                        <div>
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                            Chờ xóa (14 ngày)
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Hoạt động
                        </span>
                      )}
                    </td>
                    <td className="p-3 border-r border-gray-100 font-mono font-bold text-gray-900">
                      {u.reviewCount} bài
                    </td>
                    <td className="p-3 border-r border-gray-100 text-[11px] text-gray-500 font-mono">
                      {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setNewRole(u.role);
                          setActionType("role");
                        }}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-900 text-[11px] font-bold uppercase border border-gray-300 transition-colors"
                      >
                        Đổi vai trò
                      </button>

                      {!isSuperCanonical ? (
                        <>
                          {u.status === "suspended" || u.status === "locked" || u.status === "pending_deletion" ? (
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setActionType("restore");
                                setActionReason("");
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase transition-colors"
                            >
                              Mở khóa
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setActionType("temporary_delete");
                                setActionReason("");
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-gray-950 text-[11px] font-bold uppercase transition-colors"
                            >
                              Khóa tài khoản
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setActionType("permanent_delete");
                              setActionReason("");
                              setConfirmPermanentText("");
                            }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase transition-colors inline-flex items-center gap-1"
                            title="Xóa vĩnh viễn tài khoản và toàn bộ đánh giá"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xóa</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400 uppercase italic">
                          Bảo vệ Tối cao
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <span className="text-gray-500 font-mono">
            Hiển thị trang {page} trên tổng số {totalPages} trang ({totalCount} tài khoản)
          </span>
          <div className="flex items-center gap-1 font-mono">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 bg-white border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-gray-900 bg-white border border-gray-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 bg-white border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Single User Actions */}
      {selectedUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border-2 border-gray-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
                {actionType === "role" && <Shield className="w-4 h-4 text-purple-600" />}
                {actionType === "temporary_delete" && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                {actionType === "restore" && <UserCheck className="w-4 h-4 text-emerald-600" />}
                {actionType === "permanent_delete" && <AlertOctagon className="w-4 h-4 text-red-600" />}
                <span>
                  {actionType === "role" && "Phân quyền Tài khoản"}
                  {actionType === "temporary_delete" && "Tạm xóa / Khóa Tài khoản"}
                  {actionType === "restore" && "Khôi phục / Mở khóa Tài khoản"}
                  {actionType === "permanent_delete" && "Xóa vĩnh viễn Tài khoản"}
                </span>
              </h3>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setActionType(null);
                }}
                className="p-1 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-600 space-y-3">
              <div className="p-2.5 bg-gray-50 border border-gray-200">
                <div className="font-bold text-gray-950 text-sm">{selectedUser.displayName}</div>
                <div className="font-mono text-gray-500 mt-0.5">{selectedUser.email || selectedUser.id}</div>
                <div className="text-[11px] font-mono text-purple-700 mt-1">
                  Đang có {selectedUser.reviewCount} bài đánh giá liên kết
                </div>
              </div>

              {actionType === "role" && (
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold uppercase tracking-wider text-[11px] text-gray-700 block">
                    Chọn vai trò mới:
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full p-2 border border-gray-300 bg-white font-medium text-xs focus:outline-none focus:border-black"
                  >
                    <option value="student">Sinh viên (Student / Regular User)</option>
                    <option value="moderator">Kiểm duyệt viên (Moderator)</option>
                    <option value="support">Chuyên viên Hỗ trợ (Support Team)</option>
                    <option value="security">Chuyên viên An ninh (Security Team)</option>
                    <option value="admin">Quản trị viên (Administrator)</option>
                    <option value="super_admin">Quản trị viên Tối cao (Super Admin)</option>
                  </select>
                </div>
              )}

              {actionType === "temporary_delete" && (
                <div className="p-3 bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-1 leading-relaxed">
                  <div className="font-bold uppercase flex items-center gap-1.5 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tác động của Khóa tài khoản / Tạm xóa:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Tài khoản sẽ chuyển sang trạng thái <strong>Khóa tài khoản (Locked)</strong>. Người dùng vẫn có thể đăng nhập nhưng chỉ được chuyển đến trang Khóa để gửi đơn kháng nghị.</li>
                    <li>Hệ thống sẽ <strong>tự động gửi email thông báo khóa tài khoản</strong> kèm theo lý do vi phạm đến địa chỉ email của họ.</li>
                    <li><strong>Toàn bộ {selectedUser.reviewCount} bài đánh giá</strong> của người dùng này sẽ bị <strong>tạm ẩn</strong> khỏi trang web.</li>
                    <li>Điểm trung bình và số lượng đánh giá của các giảng viên/trường học liên quan sẽ được <strong>tính toán lại tự động</strong>.</li>
                    <li>Bạn có thể mở khóa tài khoản hoặc duyệt đơn kháng nghị của họ bất cứ lúc nào.</li>
                  </ul>
                </div>
              )}

              {actionType === "restore" && (
                <div className="p-3 bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-1 leading-relaxed">
                  <div className="font-bold uppercase flex items-center gap-1.5 text-[11px]">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tác động của Mở khóa / Khôi phục:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Tài khoản sẽ được chuyển về trạng thái <strong>Hoạt động (Active)</strong> và người dùng có thể tương tác bình thường trở lại.</li>
                    <li>Hệ thống sẽ <strong>tự động gửi email thông báo mở khóa tài khoản</strong> thông báo cho người dùng.</li>
                    <li>Các bài đánh giá đã bị ẩn trong lúc khóa sẽ được <strong>hiển thị công khai trở lại</strong>.</li>
                    <li>Điểm số và số lượng đánh giá của giảng viên/trường học sẽ được <strong>tự động tính toán lại</strong>.</li>
                  </ul>
                </div>
              )}

              {actionType === "permanent_delete" && (
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 border-2 border-red-500 text-red-950 space-y-2 leading-relaxed">
                    <div className="font-black uppercase flex items-center gap-1.5 text-xs text-red-700">
                      <AlertOctagon className="w-4 h-4 text-red-600" />
                      <span>CẢNH BÁO NGUY HIỂM: HÀNH ĐỘNG KHÔNG THỂ HOÀN TÁC!</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px]">
                      <li>Tài khoản người dùng sẽ bị <strong>xóa vĩnh viễn</strong> khỏi cơ sở dữ liệu (PostgreSQL & SQLite).</li>
                      <li><strong>TOÀN BỘ {selectedUser.reviewCount} bài đánh giá</strong> của người dùng này sẽ bị <strong>xóa vĩnh viễn</strong> hoàn toàn.</li>
                      <li>Tất cả dữ liệu bình chọn (votes), báo cáo vi phạm (reports), danh sách lưu sẽ bị xóa sạch.</li>
                      <li>Điểm đánh giá và xếp hạng của các giảng viên/trường học liên quan sẽ được <strong>tính toán lại ngay lập tức</strong>.</li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-[11px] text-gray-800 block">
                      Nhập chữ <span className="text-red-600 font-mono font-black">XÓA VĨNH VIỄN</span> để xác nhận:
                    </label>
                    <input
                      type="text"
                      value={confirmPermanentText}
                      onChange={(e) => setConfirmPermanentText(e.target.value)}
                      placeholder="XÓA VĨNH VIỄN"
                      className="w-full p-2 border border-red-400 font-mono text-xs focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <label className="font-bold uppercase tracking-wider text-[11px] text-gray-700 block">
                  Lý do điều chỉnh (lưu vào Nhật ký Kiểm toán):
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Nhập lý do thực hiện thao tác..."
                  rows={2}
                  className="w-full p-2 border border-gray-300 text-xs focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setActionType(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold uppercase transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleApplySingleAction}
                disabled={
                  actionLoading ||
                  (actionType === "permanent_delete" && confirmPermanentText.trim() !== "XÓA VĨNH VIỄN")
                }
                className={`px-4 py-2 text-white font-bold uppercase flex items-center gap-2 transition-colors disabled:opacity-40 ${
                  actionType === "permanent_delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : actionType === "temporary_delete"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : actionType === "restore"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-black hover:bg-gray-900"
                }`}
              >
                {actionLoading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {actionType === "permanent_delete"
                    ? "Xác nhận Xóa vĩnh viễn"
                    : actionType === "temporary_delete"
                    ? "Xác nhận Tạm xóa"
                    : actionType === "restore"
                    ? "Xác nhận Khôi phục"
                    : "Xác nhận Phân quyền"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Batch Action across Selected Tickboxes */}
      {batchAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border-2 border-gray-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
                {batchAction === "temporary_delete" && <UserX className="w-4 h-4 text-amber-600" />}
                {batchAction === "restore" && <UserCheck className="w-4 h-4 text-emerald-600" />}
                {batchAction === "permanent_delete" && <AlertOctagon className="w-4 h-4 text-red-600" />}
                <span>Thao tác hàng loạt ({selectedUserIds.size} tài khoản)</span>
              </h3>
              <button onClick={() => setBatchAction(null)} className="p-1 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-600 space-y-3">
              <div className="p-2.5 bg-gray-100 border border-gray-300 font-bold text-gray-950">
                Bạn đang thao tác trên <span className="text-purple-700 font-black">{selectedUserIds.size}</span> tài khoản đã chọn bằng tickbox.
              </div>

              {batchAction === "temporary_delete" && (
                <div className="p-3 bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-1.5 leading-relaxed">
                  <div className="font-bold uppercase text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tác động của Tạm xóa hàng loạt:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Toàn bộ {selectedUserIds.size} tài khoản sẽ bị chuyển sang trạng thái <strong>Tạm khóa (Suspended)</strong>.</li>
                    <li>Tất cả bài đánh giá của các tài khoản này sẽ bị <strong>ẩn khỏi hệ thống</strong>.</li>
                    <li>Điểm trung bình của tất cả giảng viên và trường học liên quan sẽ được <strong>tính toán lại tự động</strong>.</li>
                  </ul>
                </div>
              )}

              {batchAction === "restore" && (
                <div className="p-3 bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-1.5 leading-relaxed">
                  <div className="font-bold uppercase text-[11px] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tác động của Khôi phục hàng loạt:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Toàn bộ {selectedUserIds.size} tài khoản sẽ được chuyển sang <strong>Hoạt động (Active)</strong>.</li>
                    <li>Các bài đánh giá trước đó bị ẩn sẽ được <strong>hiển thị lại</strong>.</li>
                    <li>Điểm trung bình và số lượng đánh giá của các trường/giảng viên sẽ được <strong>tính toán lại</strong>.</li>
                  </ul>
                </div>
              )}

              {batchAction === "permanent_delete" && (
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 border-2 border-red-500 text-red-950 space-y-2 leading-relaxed">
                    <div className="font-black uppercase text-xs text-red-700 flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4 text-red-600" />
                      <span>CẢNH BÁO: XÓA VĨNH VIỄN HÀNG LOẠT!</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px]">
                      <li>Toàn bộ <strong>{selectedUserIds.size} tài khoản đã chọn</strong> sẽ bị <strong>xóa vĩnh viễn</strong> khỏi cơ sở dữ liệu.</li>
                      <li><strong>TẤT CẢ các bài đánh giá</strong> của những tài khoản này sẽ bị <strong>xóa hoàn toàn</strong>.</li>
                      <li>Điểm đánh giá của các giảng viên/trường học liên quan sẽ được <strong>tính toán lại ngay lập tức</strong>.</li>
                      <li>Hành động này <strong>KHÔNG THỂ PHỤC HỒI</strong>.</li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-[11px] text-gray-800 block">
                      Nhập chữ <span className="text-red-600 font-mono font-black">XÓA HÀNG LOẠT</span> để xác nhận:
                    </label>
                    <input
                      type="text"
                      value={batchConfirmPermanentText}
                      onChange={(e) => setBatchConfirmPermanentText(e.target.value)}
                      placeholder="XÓA HÀNG LOẠT"
                      className="w-full p-2 border border-red-400 font-mono text-xs focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <label className="font-bold uppercase tracking-wider text-[11px] text-gray-700 block">
                  Lý do thực hiện hàng loạt (lưu vào Nhật ký Kiểm toán):
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Nhập lý do thực hiện thao tác hàng loạt..."
                  rows={2}
                  className="w-full p-2 border border-gray-300 text-xs focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setBatchAction(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold uppercase transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleApplyBatchAction}
                disabled={
                  actionLoading ||
                  (batchAction === "permanent_delete" && batchConfirmPermanentText.trim() !== "XÓA HÀNG LOẠT")
                }
                className={`px-4 py-2 text-white font-bold uppercase flex items-center gap-2 transition-colors disabled:opacity-40 ${
                  batchAction === "permanent_delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : batchAction === "temporary_delete"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {actionLoading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {batchAction === "permanent_delete"
                    ? "Xác nhận Xóa vĩnh viễn hàng loạt"
                    : batchAction === "temporary_delete"
                    ? "Xác nhận Tạm xóa hàng loạt"
                    : "Xác nhận Khôi phục hàng loạt"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

