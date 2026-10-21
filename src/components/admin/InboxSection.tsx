"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Send,
  Eye,
  Bot,
  User,
  ShieldAlert,
  ArrowRight,
  Clock,
  Sparkles,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import { InboundTicket, InboundMailbox, InboundTicketStatus } from "@/lib/server/db";

export function InboxSection() {
  const [tickets, setTickets] = useState<InboundTicket[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [countsByStatus, setCountsByStatus] = useState<Record<string, number>>({});
  const [allowedMailboxes, setAllowedMailboxes] = useState<InboundMailbox[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [mailboxFilter, setMailboxFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Selected ticket & reply state
  const [selectedTicket, setSelectedTicket] = useState<InboundTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const params = new URLSearchParams({
        mailbox: mailboxFilter,
        status: statusFilter,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/admin/inbox?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể tải danh sách hộp thư.");
      }

      setTickets(data.tickets || []);
      setTotalCount(data.totalCount || 0);
      setCountsByStatus(data.countsByStatus || {});
      setAllowedMailboxes(data.allowedMailboxes || []);
      setUserRole(data.userRole || "");

      // If currently selected ticket is updated in the list, keep it in sync
      if (selectedTicket) {
        const updated = (data.tickets || []).find((t: InboundTicket) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error("[InboxSection] Error fetching tickets:", err);
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải danh sách thư.",
      });
    } finally {
      setLoading(false);
    }
  }, [mailboxFilter, statusFilter, searchQuery, page, selectedTicket]);

  useEffect(() => {
    fetchTickets();
  }, [mailboxFilter, statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handleSelectTicket = (ticket: InboundTicket) => {
    setSelectedTicket(ticket);
    setReplyText("");
    setFeedback(null);
  };

  const handleSendReply = async ({ closeTicket = false }: { closeTicket?: boolean } = {}) => {
    if (!selectedTicket || !replyText.trim()) return;

    setSendingReply(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/inbox/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyText: replyText.trim(), closeTicket }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gửi phản hồi thất bại.");
      }

      setFeedback({
        type: "success",
        message: closeTicket
          ? `Đã gửi phản hồi thành công tới ${selectedTicket.sender_email} và đóng ticket.`
          : `Đã gửi phản hồi tới ${selectedTicket.sender_email}. Ticket tiếp tục được mở để trao đổi.`,
      });

      setSelectedTicket(data.ticket);
      setTickets((prev) => prev.map((t) => (t.id === data.ticket.id ? data.ticket : t)));
      setReplyText("");
      fetchTickets();
    } catch (err) {
      console.error("[InboxSection] Reply error:", err);
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Lỗi gửi thư phản hồi.",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleStatus = async (targetStatus: InboundTicketStatus) => {
    if (!selectedTicket) return;
    setUpdatingStatus(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/inbox/${selectedTicket.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Cập nhật trạng thái thất bại.");
      }
      setSelectedTicket(data.ticket);
      setTickets((prev) => prev.map((t) => (t.id === data.ticket.id ? data.ticket : t)));
      setFeedback({
        type: "success",
        message: targetStatus === "resolved"
          ? `Đã đóng ticket ${selectedTicket.case_id} thành công.`
          : `Đã mở lại ticket ${selectedTicket.case_id}. Cuộc hội thoại đang hoạt động.`,
      });
      fetchTickets();
    } catch (err) {
      console.error("[InboxSection] Status update error:", err);
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Lỗi cập nhật trạng thái ticket.",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getMailboxBadge = (mailbox: InboundMailbox) => {
    switch (mailbox) {
      case "security":
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-red-100 text-red-900 border border-red-300">
            security@
          </span>
        );
      case "admin":
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300">
            admin@
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
            support@
          </span>
        );
    }
  };

  const getStatusBadge = (status: InboundTicketStatus) => {
    switch (status) {
      case "needs_human":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-500 text-white shadow-[1px_1px_0px_#111]">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Cần người thật
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-gray-950 border border-gray-900 shadow-[1px_1px_0px_#111]">
            <Clock className="w-3 h-3 shrink-0 text-gray-950" />
            Đang trao đổi
          </span>
        );
      case "auto_replied":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-400">
            <Bot className="w-3 h-3 shrink-0 text-blue-600" />
            Đã AI trả lời
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-400">
            <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-700" />
            Đã đóng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-800 border border-gray-300">
            <Clock className="w-3 h-3 shrink-0 text-gray-500" />
            Mới tiếp nhận
          </span>
        );
    }
  };

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  // Build full conversation thread for the selected ticket
  const conversationMessages = React.useMemo(() => {
    if (!selectedTicket) return [];
    if (selectedTicket.messages && selectedTicket.messages.length > 0) {
      return selectedTicket.messages;
    }
    const msgs: Array<{
      id: string;
      sender_type: "user" | "bot" | "staff";
      sender_email?: string;
      sender_name?: string;
      content: string;
      created_at: number;
    }> = [];
    if (selectedTicket.body_text) {
      msgs.push({
        id: "msg-user-initial",
        sender_type: "user",
        sender_email: selectedTicket.sender_email,
        sender_name: selectedTicket.sender_name || undefined,
        content: selectedTicket.body_text,
        created_at: selectedTicket.created_at,
      });
    }
    if (selectedTicket.agent_reply) {
      msgs.push({
        id: "msg-bot-auto",
        sender_type: "bot",
        sender_name: "RateUrProfs AI Assistant",
        content: selectedTicket.agent_reply,
        created_at: selectedTicket.created_at + 1000,
      });
    }
    if (selectedTicket.human_reply) {
      msgs.push({
        id: "msg-staff-reply",
        sender_type: "staff",
        sender_name: selectedTicket.replied_by || "Quản trị viên",
        content: selectedTicket.human_reply,
        created_at: selectedTicket.replied_at || selectedTicket.updated_at,
      });
    }
    return msgs;
  }, [selectedTicket]);

  return (
    <div className="space-y-6">
      {/* Neo-Brutalist Header Card */}
      <div className="bg-white border-2 border-gray-900 p-6 shadow-[4px_4px_0px_#111]">
        <div className="h-1.5 bg-[#e03a3e] -mt-6 -mx-6 mb-6" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-gray-900 text-white font-mono text-xs font-bold uppercase">
                INBOUND MAILBOX OPS
              </span>
              <span className="text-xs font-mono font-semibold text-gray-500">
                Vai trò của bạn: <strong className="text-gray-900 uppercase font-black">{userRole}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase text-gray-950 tracking-tight">
              Hộp Thư Đến &amp; Phản Hồi Trực Tiếp
            </h1>
            <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
              Quản trị luồng email gửi tới hệ thống RateUrProfs (admin@, support@, security@).
              Theo dõi toàn bộ cuộc hội thoại, phản hồi liên tục tới người dùng và đóng ticket khi hoàn tất.
            </p>
          </div>

          <button
            onClick={fetchTickets}
            disabled={loading}
            className="self-start md:self-auto inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs uppercase tracking-wider border-2 border-gray-900 shadow-[2px_2px_0px_#111] transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Counter Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 mt-6 border-t border-gray-200">
          <div className="p-3 bg-red-50 border-2 border-red-600 shadow-[2px_2px_0px_#111]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-800">
              Cần Người Thật
            </div>
            <div className="text-xl font-black text-red-950 font-mono">
              {countsByStatus["needs_human"] || 0}
            </div>
          </div>

          <div className="p-3 bg-amber-50 border-2 border-amber-500 shadow-[2px_2px_0px_#111]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
              Đang Trao Đổi
            </div>
            <div className="text-xl font-black text-amber-950 font-mono">
              {countsByStatus["in_progress"] || 0}
            </div>
          </div>

          <div className="p-3 bg-blue-50 border-2 border-blue-600 shadow-[2px_2px_0px_#111]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
              Đã AI Trả Lời
            </div>
            <div className="text-xl font-black text-blue-950 font-mono">
              {countsByStatus["auto_replied"] || 0}
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border-2 border-emerald-600 shadow-[2px_2px_0px_#111]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Đã Đóng / Xong
            </div>
            <div className="text-xl font-black text-emerald-950 font-mono">
              {countsByStatus["resolved"] || 0}
            </div>
          </div>

          <div className="p-3 bg-gray-50 border-2 border-gray-900 shadow-[2px_2px_0px_#111]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
              Tổng Thư Trong Hộp
            </div>
            <div className="text-xl font-black text-gray-950 font-mono">
              {totalCount}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div
          className={`p-4 border-2 shadow-[3px_3px_0px_#111] text-xs font-bold flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-600 text-emerald-950"
              : "bg-red-50 border-red-600 text-red-950"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-500 hover:text-black font-black uppercase text-[10px] ml-4 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Mailbox Isolation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-gray-900 pb-2">
        {allowedMailboxes.length > 1 && (
          <button
            onClick={() => {
              setMailboxFilter("all");
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-gray-900 transition-all cursor-pointer ${
              mailboxFilter === "all"
                ? "bg-gray-900 text-white shadow-[2px_2px_0px_#e03a3e]"
                : "bg-white text-gray-800 hover:bg-gray-100 shadow-[2px_2px_0px_#111]"
            }`}
          >
            Tất cả Hộp Thư ({allowedMailboxes.length})
          </button>
        )}

        {allowedMailboxes.includes("support") && (
          <button
            onClick={() => {
              setMailboxFilter("support");
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-gray-900 transition-all cursor-pointer ${
              mailboxFilter === "support"
                ? "bg-amber-400 text-gray-950 shadow-[2px_2px_0px_#111]"
                : "bg-white text-gray-800 hover:bg-amber-50 shadow-[2px_2px_0px_#111]"
            }`}
          >
            support@rateurprofs.site
          </button>
        )}

        {allowedMailboxes.includes("security") && (
          <button
            onClick={() => {
              setMailboxFilter("security");
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-gray-900 transition-all cursor-pointer ${
              mailboxFilter === "security"
                ? "bg-red-500 text-white shadow-[2px_2px_0px_#111]"
                : "bg-white text-gray-800 hover:bg-red-50 shadow-[2px_2px_0px_#111]"
            }`}
          >
            security@rateurprofs.site
          </button>
        )}

        {allowedMailboxes.includes("admin") && (
          <button
            onClick={() => {
              setMailboxFilter("admin");
              setPage(1);
            }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-gray-900 transition-all cursor-pointer ${
              mailboxFilter === "admin"
                ? "bg-purple-600 text-white shadow-[2px_2px_0px_#111]"
                : "bg-white text-gray-800 hover:bg-purple-50 shadow-[2px_2px_0px_#111]"
            }`}
          >
            admin@rateurprofs.site
          </button>
        )}
      </div>

      {/* Main 2-Column Split: Ticket List & Ticket Detail / Reply Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Search, Filter, and Ticket List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Search & Status Filter bar */}
          <div className="bg-white border-2 border-gray-900 p-3 shadow-[3px_3px_0px_#111] space-y-2">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm Mã Case, email, tiêu đề..."
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-300 text-xs font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold uppercase hover:bg-black transition-colors cursor-pointer"
              >
                Lọc
              </button>
            </form>

            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              <Filter className="w-3 h-3 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs bg-white border border-gray-300 py-1 px-2 font-bold text-gray-800 focus:outline-none focus:border-gray-900"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="needs_human">Cần người thật xử lý</option>
                <option value="in_progress">Đang trao đổi / Mở</option>
                <option value="auto_replied">Đã có AI trả lời</option>
                <option value="resolved">Đã giải quyết xong / Đã đóng</option>
                <option value="new">Mới tiếp nhận</option>
              </select>
            </div>
          </div>

          {/* Ticket List Items */}
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {loading && tickets.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-gray-500 bg-white border-2 border-gray-300">
                <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-gray-700" />
                Đang nạp danh sách email...
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 bg-white border-2 border-dashed border-gray-300">
                Không tìm thấy yêu cầu liên hệ nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    className={`p-3.5 border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-yellow-50 border-gray-900 shadow-[3px_3px_0px_#e03a3e] -translate-x-0.5"
                        : "bg-white border-gray-900 hover:bg-gray-50 shadow-[2px_2px_0px_#111]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs font-black uppercase text-gray-950 bg-gray-100 px-1.5 py-0.5 border border-gray-300">
                        {t.case_id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {getMailboxBadge(t.mailbox)}
                        {getStatusBadge(t.status)}
                      </div>
                    </div>

                    <div className="text-xs font-bold text-gray-950 truncate mb-1" title={t.subject}>
                      {t.subject}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
                      <span className="truncate max-w-[200px]" title={t.sender_email}>
                        {t.sender_name ? `${t.sender_name} (${t.sender_email})` : t.sender_email}
                      </span>
                      <span>{formatTimestamp(t.created_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Ticket Detail & Manual Reply Composer (7 cols) */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="bg-white border-2 border-gray-900 p-6 shadow-[4px_4px_0px_#111] space-y-6">
              {/* Ticket Meta Header with Action Button */}
              <div className="border-b-2 border-gray-900 pb-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black bg-gray-900 text-white px-2 py-0.5">
                      {selectedTicket.case_id}
                    </span>
                    {getMailboxBadge(selectedTicket.mailbox)}
                    {getStatusBadge(selectedTicket.status)}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Separate Close / Reopen Ticket Button */}
                    {selectedTicket.status !== "resolved" ? (
                      <button
                        onClick={() => handleToggleStatus("resolved")}
                        disabled={updatingStatus}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-950 text-xs font-black uppercase tracking-wider border-2 border-gray-900 shadow-[2px_2px_0px_#111] transition-all cursor-pointer disabled:opacity-50"
                        title="Đóng ticket khi đã hoàn thành hỗ trợ"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{updatingStatus ? "Đang xử lý..." : "Đóng Ticket"}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus("in_progress")}
                        disabled={updatingStatus}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-300 hover:bg-amber-400 text-gray-950 text-xs font-black uppercase tracking-wider border-2 border-gray-900 shadow-[2px_2px_0px_#111] transition-all cursor-pointer disabled:opacity-50"
                        title="Mở lại ticket để tiếp tục trao đổi"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-gray-950" />
                        <span>{updatingStatus ? "Đang xử lý..." : "Mở Lại Ticket"}</span>
                      </button>
                    )}

                    <span className="text-xs font-mono text-gray-500 hidden sm:inline">
                      Tiếp nhận: {formatTimestamp(selectedTicket.created_at)}
                    </span>
                  </div>
                </div>

                <h2 className="text-lg font-black uppercase text-gray-950 tracking-tight">
                  {selectedTicket.subject}
                </h2>

                <div className="p-2.5 bg-gray-50 border border-gray-300 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-gray-500">Người gửi: </span>
                    <strong className="text-gray-950">{selectedTicket.sender_name || "Khách"}</strong>{" "}
                    &lt;{selectedTicket.sender_email}&gt;
                  </div>
                  <div>
                    <span className="text-gray-500">Gửi tới: </span>
                    <strong className="text-gray-950">{selectedTicket.mailbox}@rateurprofs.site</strong>
                  </div>
                </div>
              </div>

              {/* Full Conversation Thread Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-gray-900 pb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#e03a3e]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-950">
                      Diễn Biến Cuộc Hội Thoại ({conversationMessages.length} tin nhắn)
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-gray-500">
                    Chuỗi hội thoại đa chiều
                  </span>
                </div>

                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  {conversationMessages.length === 0 ? (
                    <div className="p-4 bg-gray-50 border-2 border-gray-900 text-xs text-gray-500 font-mono text-center">
                      Chưa có tin nhắn nào trong cuộc hội thoại này.
                    </div>
                  ) : (
                    conversationMessages.map((msg, idx) => {
                      if (msg.sender_type === "bot") {
                        return (
                          <div key={msg.id || idx} className="space-y-1.5 pl-2 sm:pl-4">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] border border-gray-900">
                                  <Bot className="w-3.5 h-3.5" />
                                </span>
                                <strong className="text-blue-950 font-bold">Trợ Lý AI Tự Động</strong>
                                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 border border-blue-400 text-[9px] font-bold uppercase">
                                  AI Auto-Reply
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-500">{formatTimestamp(msg.created_at)}</span>
                            </div>
                            <div className="p-4 bg-blue-50/70 border-2 border-blue-900 shadow-[2px_2px_0px_#1e3a8a] text-xs text-gray-900 leading-relaxed">
                              <div dangerouslySetInnerHTML={{ __html: msg.content }} className="prose prose-xs max-w-none" />
                            </div>
                          </div>
                        );
                      }

                      if (msg.sender_type === "staff") {
                        return (
                          <div key={msg.id || idx} className="space-y-1.5 pl-2 sm:pl-4">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] border border-gray-900">
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                </span>
                                <strong className="text-emerald-950 font-bold">
                                  {msg.sender_name || "Nhân viên hỗ trợ"}
                                </strong>
                                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-950 border border-emerald-600 text-[9px] font-black uppercase">
                                  Đội ngũ Quản trị
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-500">{formatTimestamp(msg.created_at)}</span>
                            </div>
                            <div className="p-4 bg-emerald-50/70 border-2 border-gray-900 shadow-[2px_2px_0px_#059669] text-xs text-gray-900 font-mono whitespace-pre-wrap leading-relaxed">
                              {msg.content}
                            </div>
                          </div>
                        );
                      }

                      // User message
                      return (
                        <div key={msg.id || idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 bg-gray-900 text-white flex items-center justify-center font-bold text-[10px] border border-gray-900">
                                <User className="w-3.5 h-3.5" />
                              </span>
                              <strong className="text-gray-950 font-bold">
                                {msg.sender_name || selectedTicket.sender_name || "Người dùng"}
                              </strong>
                              <span className="text-gray-500 text-[11px] hidden sm:inline">
                                &lt;{msg.sender_email || selectedTicket.sender_email}&gt;
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-500">{formatTimestamp(msg.created_at)}</span>
                          </div>
                          <div className="p-4 bg-gray-50 border-2 border-gray-900 shadow-[2px_2px_0px_#111] text-xs text-gray-900 font-mono whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedTicket.status === "resolved" && (
                  <div className="p-3 bg-gray-100 border-2 border-dashed border-gray-400 text-xs font-mono text-gray-700 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Ticket này đang ở trạng thái <strong>Đã Đóng</strong>. Bạn có thể gửi phản hồi để tự động mở lại ticket và tiếp tục hội thoại.</span>
                    </div>
                    <button
                      onClick={() => handleToggleStatus("in_progress")}
                      disabled={updatingStatus}
                      className="px-2.5 py-1 bg-amber-300 hover:bg-amber-400 text-gray-950 font-bold text-[11px] uppercase border border-gray-900 shadow-[1px_1px_0px_#111] cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      Mở lại ngay
                    </button>
                  </div>
                )}
              </div>

              {/* Manual Staff Reply Composer */}
              <div className="space-y-3 pt-4 border-t-2 border-gray-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#e03a3e]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-950">
                      Soạn Thư Phản Hồi Trực Tiếp
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-gray-500">
                    Gửi từ: <strong className="text-gray-900">{selectedTicket.mailbox}@rateurprofs.site</strong>
                  </span>
                </div>

                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Thư sẽ được gửi tới <strong>{selectedTicket.sender_email}</strong> với tiêu đề Re: [{selectedTicket.case_id}] và được lưu vào chuỗi cuộc hội thoại này.
                </p>

                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                  placeholder={`Chào bạn,\n\nTôi là nhân viên phụ trách bộ phận ${
                    selectedTicket.mailbox === "security"
                      ? "An ninh"
                      : selectedTicket.mailbox === "admin"
                      ? "Ban Quản trị"
                      : "Hỗ trợ"
                  } tại RateUrProfs. Liên quan đến vấn đề ${selectedTicket.case_id} của bạn...`}
                  className="w-full p-3 bg-gray-50 border-2 border-gray-900 text-xs font-sans text-gray-950 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-red-600"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-[10px] font-mono text-gray-500">
                    Độ dài: {replyText.length} ký tự
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Primary Button: Send Reply (keeps ticket open in in_progress) */}
                    <button
                      onClick={() => handleSendReply({ closeTicket: false })}
                      disabled={sendingReply || updatingStatus || !replyText.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider border-2 border-gray-900 shadow-[2px_2px_0px_#e03a3e] transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                      title="Gửi phản hồi và giữ ticket mở để tiếp tục trao đổi"
                    >
                      {sendingReply ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang gửi...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Gửi Phản Hồi</span>
                        </>
                      )}
                    </button>

                    {/* Secondary Button: Send & Close Ticket */}
                    <button
                      onClick={() => handleSendReply({ closeTicket: true })}
                      disabled={sendingReply || updatingStatus || !replyText.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider border-2 border-gray-900 shadow-[2px_2px_0px_#111] transition-all active:translate-x-0.5 active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                      title="Gửi phản hồi và đóng ticket khi vấn đề đã được giải quyết xong"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Gửi &amp; Đóng Ticket</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-gray-300 p-16 text-center space-y-3">
              <Mail className="w-12 h-12 text-gray-300 mx-auto" />
              <h3 className="text-sm font-black uppercase text-gray-700 tracking-wider">
                Chưa Chọn Yêu Cầu Nào
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Nhấp vào bất kỳ bức thư nào ở cột bên trái để xem nội dung chi tiết, kiểm tra diễn biến cuộc hội thoại và soạn thư trả lời trực tiếp.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
