"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Send,
  RotateCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Eye,
  Server,
  Filter,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Ban,
  Trash2,
  Copy,
  Check,
} from "lucide-react";

interface ProviderOverview {
  provider: {
    provider: string;
    isSandbox: boolean;
    configured: boolean;
    senderDomain: string;
    senderIdentities: {
      noReply: string;
      support: string;
      security: string;
      admin: string;
    };
  };
  stats: {
    total: number;
    queued: number;
    processing: number;
    sent: number;
    delivered: number;
    bounced: number;
    failed: number;
    suppressionsCount: number;
  };
  dns: {
    domain: string;
    spf: { recordType: string; name: string; expectedValue: string; status: string; details?: string };
    dkim: { recordType: string; name: string; expectedValue: string; status: string; details?: string };
    dmarc: { recordType: string; name: string; expectedValue: string; status: string; details?: string };
    mx: { recordType: string; name: string; expectedValue: string; status: string; details?: string };
    allPassing: boolean;
  };
}

interface EmailJob {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  template_id: string;
  locale: string;
  status: "queued" | "processing" | "sent" | "delivered" | "bounced" | "failed";
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  provider?: string | null;
  provider_message_id?: string | null;
  created_at: number;
  sent_at: number | null;
}

export function EmailSection() {
  const [overview, setOverview] = useState<ProviderOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Jobs list state
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [templateFilter, setTemplateFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Modals & Tools
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [suppressionModalOpen, setSuppressionModalOpen] = useState(false);

  // Worker Tick Feedback
  const [workerRunning, setWorkerRunning] = useState(false);
  const [workerFeedback, setWorkerFeedback] = useState<string | null>(null);

  // Test send state
  const [testRecipient, setTestRecipient] = useState("dungpubgame@gmail.com");
  const [testTemplate, setTestTemplate] = useState("test_email");
  const [testLocale, setTestLocale] = useState("vi");
  const [testSending, setTestSending] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState("review_moderated");
  const [previewLocale, setPreviewLocale] = useState("vi");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewText, setPreviewText] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [previewTab, setPreviewTab] = useState<"html" | "text">("html");

  // Suppressions list state
  const [suppressions, setSuppressions] = useState<Array<{ email: string; reason: string; created_at: number }>>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/email/overview", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setOverview(data);
      } else {
        setError(data.error || "Không thể tải cấu hình email.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi kết nối API overview");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "15",
      });
      if (statusFilter) params.set("status", statusFilter);
      if (templateFilter) params.set("templateId", templateFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/email/jobs?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs || []);
        setJobsTotal(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (e) {
      console.error("[EmailSection] Failed to fetch jobs:", e);
    }
  }, [page, statusFilter, templateFilter, searchQuery]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleWorkerTick = async () => {
    try {
      setWorkerRunning(true);
      setWorkerFeedback(null);
      const res = await fetch("/api/admin/email/worker/tick?limit=20", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setWorkerFeedback(
          `Đã xử lý ${data.processed} tác vụ: ${data.succeeded} thành công, ${data.retried} thử lại, ${data.failed} thất bại.`
        );
        fetchOverview();
        fetchJobs();
      } else {
        setWorkerFeedback(`Lỗi worker: ${data.error}`);
      }
    } catch (e) {
      setWorkerFeedback(`Lỗi kết nối worker: ${e instanceof Error ? e.message : "N/A"}`);
    } finally {
      setWorkerRunning(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      setRetryingId(jobId);
      const res = await fetch(`/api/admin/email/jobs/${jobId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        fetchOverview();
        fetchJobs();
      } else {
        alert(`Không thể thử lại: ${data.error}`);
      }
    } catch (e) {
      alert(`Lỗi: ${e instanceof Error ? e.message : "N/A"}`);
    } finally {
      setRetryingId(null);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTestSending(true);
      setTestSuccessMessage(null);
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: testRecipient,
          templateId: testTemplate,
          locale: testLocale,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestSuccessMessage(data.message || "Gửi thư thử nghiệm thành công!");
        fetchOverview();
        fetchJobs();
      } else {
        alert(`Lỗi gửi: ${data.error}`);
      }
    } catch (e) {
      alert(`Lỗi kết nối: ${e instanceof Error ? e.message : "N/A"}`);
    } finally {
      setTestSending(false);
    }
  };

  const handleLoadPreview = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/email/preview?templateId=${previewTemplate}&locale=${previewLocale}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.success) {
        setPreviewHtml(data.html || "");
        setPreviewText(data.text || "");
        setPreviewSubject(data.subject || "");
      }
    } catch (e) {
      console.error("[EmailSection] Failed to load preview:", e);
    }
  }, [previewTemplate, previewLocale]);

  useEffect(() => {
    if (previewModalOpen) {
      handleLoadPreview();
    }
  }, [previewModalOpen, handleLoadPreview]);

  const handleOpenSuppressions = async () => {
    setSuppressionModalOpen(true);
    try {
      const res = await fetch("/api/admin/email/suppressions");
      const data = await res.json();
      if (data.success) {
        setSuppressions(data.suppressions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveSuppression = async (email: string) => {
    if (!confirm(`Xác nhận bỏ chặn cho địa chỉ email "${email}"?`)) return;
    try {
      const res = await fetch(`/api/admin/email/suppressions?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSuppressions((prev) => prev.filter((s) => s.email !== email));
        fetchOverview();
      }
    } catch (e) {
      alert("Lỗi khi gỡ chặn");
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3">
        <RotateCw className="w-8 h-8 animate-spin mx-auto text-black" />
        <p className="text-xs uppercase font-mono font-bold tracking-widest text-gray-600">
          Đang nạp thông số hệ thống email RateUrProfs...
        </p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-6 bg-red-50 border border-red-200">
        <div className="flex items-center gap-2 font-bold text-red-950 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span>Lỗi tải Bảng điều khiển Email</span>
        </div>
        <p className="text-xs text-red-800 font-mono mb-4">{error}</p>
        <button
          onClick={fetchOverview}
          className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const { provider, stats, dns } = overview;

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="inline-block px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-[10px] font-mono font-bold uppercase tracking-wider text-[#1d4ed8] mb-1">
            GCP Cloud-Native Transactional Mailer
          </div>
          <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-[#1d4ed8]" />
            Quản trị Hệ thống Email (rateurprofs.site)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Phát hành email giao dịch tự động, hàng đợi bền vững Outbox, nhật ký phân phối và kiểm tra xác thực DNS.
          </p>
        </div>

        {/* Global Email Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTestModalOpen(true)}
            className="px-3.5 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase tracking-wider border border-[#1d4ed8] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-white" />
            <span>Gửi Thử nghiệm</span>
          </button>

          <button
            onClick={() => setPreviewModalOpen(true)}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#1d4ed8] font-mono font-bold text-xs uppercase tracking-wider border border-blue-200 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem trước Mẫu</span>
          </button>

          <button
            onClick={handleWorkerTick}
            disabled={workerRunning}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-mono font-bold text-xs uppercase tracking-wider border border-gray-200 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${workerRunning ? "animate-spin" : ""}`} />
            <span>Xử lý Outbox</span>
          </button>
        </div>
      </div>

      {/* WORKER TICK ALERT FEEDBACK */}
      {workerFeedback && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-xs font-mono text-blue-950 flex items-center justify-between">
          <span>{workerFeedback}</span>
          <button
            onClick={() => setWorkerFeedback(null)}
            className="font-bold text-[#1d4ed8] ml-4 hover:underline"
          >
            [ĐÓNG]
          </button>
        </div>
      )}

      {/* METRICS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 border border-gray-200">
          <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Đang chờ (Queued)</div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">{stats.queued}</div>
          <div className="text-[10px] font-mono text-[#1d4ed8] mt-1">Đang chờ worker</div>
        </div>

        <div className="bg-white p-3.5 border border-gray-200">
          <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Đang gửi (Processing)</div>
          <div className="text-2xl font-black font-mono text-[#1d4ed8] mt-1">{stats.processing}</div>
          <div className="text-[10px] font-mono text-[#1d4ed8] mt-1">Đang phát hành</div>
        </div>

        <div className="bg-white p-3.5 border border-gray-200">
          <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Đã phát (Sent)</div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">{stats.sent}</div>
          <div className="text-[10px] font-mono text-[#1d4ed8] mt-1">Gửi tới provider</div>
        </div>

        <div className="bg-white p-3.5 border border-gray-200">
          <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Đã tới hòm (Delivered)</div>
          <div className="text-2xl font-black font-mono text-[#1d4ed8] mt-1">{stats.delivered}</div>
          <div className="text-[10px] font-mono text-[#1d4ed8] mt-1">Webhook xác nhận</div>
        </div>

        <div className="bg-white p-3.5 border border-gray-200">
          <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Thất bại / Dead-letter</div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">{stats.failed}</div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">{stats.bounced} trả về (bounce)</div>
        </div>

        <div
          onClick={handleOpenSuppressions}
          className="bg-red-50 p-3.5 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
        >
          <div className="text-[10px] font-mono font-bold uppercase text-red-900 flex items-center justify-between">
            <span>Danh sách chặn</span>
            <Ban className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black font-mono text-red-950 mt-1">{stats.suppressionsCount}</div>
          <div className="text-[10px] font-mono text-red-700 underline mt-1">Xem & gỡ chặn &rarr;</div>
        </div>
      </div>

      {/* TWO COLUMN GRID: PROVIDER CONFIG & DNS VALIDATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: PROVIDER CONFIGURATION */}
        <div className="bg-white border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold uppercase text-xs tracking-wider text-slate-900">
                Cấu hình Nhà phân phối (Delivery Provider)
              </h3>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                provider.isSandbox
                  ? "bg-blue-50 text-[#1d4ed8] border-blue-200"
                  : provider.configured
                  ? "bg-blue-50 text-[#1d4ed8] border-blue-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {provider.isSandbox ? "Sandbox / Mock Mode" : `Live: ${provider.provider.toUpperCase()}`}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
              <span className="font-mono text-gray-500">Tên miền phát hành</span>
              <span className="col-span-2 font-mono font-bold text-black">{provider.senderDomain}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
              <span className="font-mono text-gray-500">Giao thức truyền tải</span>
              <span className="col-span-2 font-mono text-black">HTTPS REST API (Port 443 — Cloud Run Native)</span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-gray-100">
              <span className="font-mono text-gray-500">Bảo mật Khóa API</span>
              <span className="col-span-2 font-mono text-emerald-800 font-bold">
                {provider.configured ? "•••••••••••••••• (Đã kích hoạt)" : "Chưa cấu hình API Key"}
              </span>
            </div>

            <div className="pt-2">
              <span className="font-mono text-[11px] font-black uppercase text-gray-700 block mb-2">
                Danh tính gửi tin (Sender Identities)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 bg-slate-50 border border-gray-200">
                  <div className="text-slate-500 text-[10px]">Tự động giao dịch:</div>
                  <div className="font-bold text-slate-900 truncate">{provider.senderIdentities.noReply}</div>
                </div>
                <div className="p-2 bg-slate-50 border border-gray-200">
                  <div className="text-slate-500 text-[10px]">Hỗ trợ sinh viên:</div>
                  <div className="font-bold text-slate-900 truncate">{provider.senderIdentities.support}</div>
                </div>
                <div className="p-2 bg-slate-50 border border-gray-200">
                  <div className="text-slate-500 text-[10px]">Cảnh báo bảo mật:</div>
                  <div className="font-bold text-slate-900 truncate">{provider.senderIdentities.security}</div>
                </div>
                <div className="p-2 bg-slate-50 border border-gray-200">
                  <div className="text-slate-500 text-[10px]">Quản trị & Báo cáo:</div>
                  <div className="font-bold text-slate-900 truncate">{provider.senderIdentities.admin}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: DNS AUTHENTICATION & DELIVERABILITY STATUS */}
        <div className="bg-white border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1d4ed8]" />
              <h3 className="font-bold uppercase text-xs tracking-wider text-slate-900">
                Kiểm tra Bản ghi DNS (Cloudflare)
              </h3>
            </div>
            <button
              onClick={fetchOverview}
              className="text-[10px] font-mono font-bold text-[#1d4ed8] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              Làm mới DNS
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* SPF RECORD */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900">1. SPF Record (TXT)</span>
                <span
                  className={`px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase ${
                    dns.spf.status === "verified"
                      ? "bg-blue-50 text-[#1d4ed8] border border-blue-200"
                      : "bg-slate-100 text-slate-700 border border-slate-300"
                  }`}
                >
                  {dns.spf.status === "verified" ? "Đã liên kết" : "Cần gộp bản ghi"}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-600 break-all">{dns.spf.details || dns.spf.expectedValue}</p>
              <button
                onClick={() => copyToClipboard(dns.spf.expectedValue, "spf")}
                className="text-[10px] font-mono text-[#1d4ed8] font-bold flex items-center gap-1 hover:underline cursor-pointer pt-0.5"
              >
                {copiedKey === "spf" ? <Check className="w-3 h-3 text-[#1d4ed8]" /> : <Copy className="w-3 h-3" />}
                <span>Sao chép bản ghi SPF chuẩn</span>
              </button>
            </div>

            {/* DKIM RECORD */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900">2. DKIM Selector (TXT / CNAME)</span>
                <span
                  className={`px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase ${
                    dns.dkim.status === "verified"
                      ? "bg-blue-50 text-[#1d4ed8] border border-blue-200"
                      : "bg-slate-100 text-slate-700 border border-slate-300"
                  }`}
                >
                  {dns.dkim.status === "verified" ? "Đã xác thực" : "Chờ kích hoạt Resend"}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-600 break-all">
                Host: <code className="font-bold">resend._domainkey.rateurprofs.site</code>
              </p>
            </div>

            {/* DMARC RECORD */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900">3. DMARC Policy (TXT)</span>
                <span
                  className={`px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase ${
                    dns.dmarc.status === "verified"
                      ? "bg-blue-50 text-[#1d4ed8] border border-blue-200"
                      : "bg-slate-100 text-slate-700 border border-slate-300"
                  }`}
                >
                  {dns.dmarc.status === "verified" ? "Hoạt động" : "Chưa gắn"}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-600 break-all">{dns.dmarc.details || dns.dmarc.expectedValue}</p>
              <button
                onClick={() => copyToClipboard(dns.dmarc.expectedValue, "dmarc")}
                className="text-[10px] font-mono text-[#1d4ed8] font-bold flex items-center gap-1 hover:underline cursor-pointer pt-0.5"
              >
                {copiedKey === "dmarc" ? <Check className="w-3 h-3 text-[#1d4ed8]" /> : <Copy className="w-3 h-3" />}
                <span>Sao chép bản ghi DMARC</span>
              </button>
            </div>

            {/* MX RECORDS FOR INBOUND FORWARDING */}
            <div className="p-2.5 bg-blue-50 border border-blue-200 text-[11px] font-mono text-blue-950 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1d4ed8] shrink-0" />
              <span>{dns.mx.details || "Bản ghi Namecheap MX Email Forwarding được bảo toàn 100%."}</span>
            </div>
          </div>
        </div>
      </div>

      {/* OUTBOX JOBS LOG TABLE */}
      <div className="bg-white border border-gray-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold uppercase text-xs tracking-wider text-slate-900">
              Nhật ký Hàng đợi Giao vận (Outbox Queue Log)
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500">({jobsTotal} thư)</span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Tìm email hoặc chủ đề..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-mono border border-gray-300 focus:border-[#1d4ed8] bg-white focus:outline-none w-48 sm:w-56"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="py-1.5 px-2 text-xs font-mono border border-gray-300 focus:border-[#1d4ed8] bg-white focus:outline-none cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="queued">Queued (Chờ)</option>
              <option value="processing">Processing (Đang gửi)</option>
              <option value="sent">Sent (Đã gửi)</option>
              <option value="delivered">Delivered (Đã tới)</option>
              <option value="failed">Failed (Thất bại)</option>
            </select>

            <select
              value={templateFilter}
              onChange={(e) => {
                setTemplateFilter(e.target.value);
                setPage(1);
              }}
              className="py-1.5 px-2 text-xs font-mono border border-gray-300 focus:border-[#1d4ed8] bg-white focus:outline-none cursor-pointer"
            >
              <option value="">Tất cả mẫu</option>
              <option value="password_reset">Đặt lại Mật khẩu</option>
              <option value="security_alert">Cảnh báo Bảo mật</option>
              <option value="review_moderated">Kiểm duyệt Đánh giá</option>
              <option value="correction_update">Đính chính Hồ sơ</option>
              <option value="admin_alert">Cảnh báo Admin</option>
              <option value="test_email">Thử nghiệm</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-[11px] font-bold uppercase text-slate-700">
                <th className="p-2.5 border-r border-gray-200">Thời gian</th>
                <th className="p-2.5 border-r border-gray-200">Người nhận</th>
                <th className="p-2.5 border-r border-gray-200">Mẫu (Template)</th>
                <th className="p-2.5 border-r border-gray-200">Chủ đề</th>
                <th className="p-2.5 border-r border-gray-200 text-center">Trạng thái</th>
                <th className="p-2.5 border-r border-gray-200 text-center">Thử lại</th>
                <th className="p-2.5 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">
                    Chưa có tác vụ gửi email nào trong bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 border-r border-gray-200 text-slate-600 whitespace-nowrap">
                      {new Date(job.created_at).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="p-2.5 border-r border-gray-200 font-bold text-slate-900 truncate max-w-[160px]">
                      {job.recipient}
                    </td>
                    <td className="p-2.5 border-r border-gray-200">
                      <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
                        {job.template_id}
                      </span>
                    </td>
                    <td className="p-2.5 border-r border-gray-200 text-slate-800 truncate max-w-[200px]" title={job.subject}>
                      {job.subject}
                    </td>
                    <td className="p-2.5 border-r border-gray-200 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase border ${
                            job.status === "delivered"
                              ? "bg-blue-50 text-[#1d4ed8] border-blue-200"
                              : job.status === "sent"
                              ? "bg-blue-50 text-[#1d4ed8] border-blue-200"
                              : job.status === "queued"
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : job.status === "processing"
                              ? "bg-blue-100 text-[#1d4ed8] border-blue-300"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {job.status}
                        </span>
                        {job.provider && (
                          <span
                            className="text-[9px] px-1 font-mono uppercase border bg-slate-50 text-slate-600 border-slate-200"
                            title={`Nhà phân phối: ${job.provider}${job.provider_message_id ? ` (ID: ${job.provider_message_id})` : ""}`}
                          >
                            {job.provider === "sandbox" ? "sandbox (mock)" : job.provider}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2.5 border-r border-gray-200 text-center text-slate-700">
                      {job.retry_count}/{job.max_retries}
                    </td>
                    <td className="p-2.5 text-center">
                      {job.status === "failed" ? (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          disabled={retryingId === job.id}
                          className="px-2 py-1 bg-[#1d4ed8] text-white hover:bg-[#1e40af] text-[10px] font-bold uppercase transition-colors cursor-pointer"
                        >
                          {retryingId === job.id ? "Đang gửi..." : "Thử lại"}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 text-xs font-mono">
          <span className="text-slate-500">
            Trang {page} / {totalPages} (Tổng {jobsTotal} tác vụ)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 border border-gray-300 bg-white hover:bg-slate-50 disabled:opacity-30 cursor-pointer text-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 border border-gray-300 bg-white hover:bg-slate-50 disabled:opacity-30 cursor-pointer text-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: TEST EMAIL DISPATCH */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 max-w-md w-full p-6 space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="font-bold uppercase text-sm tracking-tight text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-[#1d4ed8]" />
                Phát hành Thư Thử nghiệm (Test Email)
              </h3>
              <button
                onClick={() => setTestModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendTest} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block font-bold text-slate-900 mb-1">ĐỊA CHỈ NHẬN THỬ NGHIỆM:</label>
                <input
                  type="email"
                  required
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full p-2 border border-gray-300 focus:border-[#1d4ed8] text-xs font-mono bg-white focus:outline-none"
                  placeholder="admin@rateurprofs.site"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">MẪU EMAIL:</label>
                  <select
                    value={testTemplate}
                    onChange={(e) => setTestTemplate(e.target.value)}
                    className="w-full p-2 border border-gray-300 focus:border-[#1d4ed8] text-xs font-mono bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="test_email">Chẩn đoán hệ thống (Diagnostic)</option>
                    <option value="password_reset">Đặt lại mật khẩu</option>
                    <option value="security_alert">Cảnh báo bảo mật</option>
                    <option value="review_moderated">Kiểm duyệt đánh giá</option>
                    <option value="correction_update">Đính chính hồ sơ</option>
                    <option value="admin_alert">Cảnh báo admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">NGÔN NGỮ:</label>
                  <select
                    value={testLocale}
                    onChange={(e) => setTestLocale(e.target.value)}
                    className="w-full p-2 border border-gray-300 focus:border-[#1d4ed8] text-xs font-mono bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="vi">Tiếng Việt (vi)</option>
                    <option value="en">English (en)</option>
                  </select>
                </div>
              </div>

              {overview?.provider.isSandbox && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-950 font-mono text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-[#1d4ed8] uppercase">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#1d4ed8] shrink-0" />
                    <span>Hệ thống đang chạy ở chế độ Sandbox (Mô phỏng)</span>
                  </div>
                  <p className="text-[10px] text-slate-700 leading-relaxed">
                    Chưa có API Key (<code>RESEND_API_KEY</code> hoặc <code>SENDGRID_API_KEY</code>). Thư sẽ được ghi vào Outbox nội bộ để kiểm tra giao diện/quy trình nhưng <strong>không chuyển phát thực tế tới hộp thư Gmail</strong>.
                  </p>
                </div>
              )}

              {testSuccessMessage && (
                <div
                  className={`p-3 border font-mono text-[11px] ${
                    overview?.provider.isSandbox
                      ? "bg-blue-50 border-blue-200 text-blue-950"
                      : "bg-blue-50 border-blue-200 text-blue-950"
                  }`}
                >
                  {testSuccessMessage}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 font-bold uppercase text-slate-700 border border-gray-200 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={testSending}
                  className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] font-bold uppercase text-white border border-[#1d4ed8] flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {testSending ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{testSending ? "Đang gửi..." : "Xác nhận gửi"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TEMPLATE PREVIEW */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 max-w-3xl w-full h-[90vh] flex flex-col p-6 font-sans">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 shrink-0">
              <h3 className="font-bold uppercase text-sm tracking-tight text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#1d4ed8]" />
                Xem trước Giao diện Email (Email Template Preview)
              </h3>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Template & Locale Pickers */}
            <div className="py-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 shrink-0 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Mẫu:</span>
                <select
                  value={previewTemplate}
                  onChange={(e) => setPreviewTemplate(e.target.value)}
                  className="p-1.5 border border-gray-300 focus:border-[#1d4ed8] bg-white focus:outline-none cursor-pointer"
                >
                  <option value="review_moderated">Kiểm duyệt đánh giá (Moderation)</option>
                  <option value="password_reset">Đặt lại mật khẩu (Password Reset)</option>
                  <option value="security_alert">Cảnh báo bảo mật (Security Alert)</option>
                  <option value="correction_update">Đính chính hồ sơ (Correction)</option>
                  <option value="admin_alert">Cảnh báo quản trị (Admin Alert)</option>
                  <option value="test_email">Thử nghiệm hệ thống (Test Email)</option>
                </select>

                <select
                  value={previewLocale}
                  onChange={(e) => setPreviewLocale(e.target.value)}
                  className="p-1.5 border border-gray-300 focus:border-[#1d4ed8] bg-white focus:outline-none ml-1 cursor-pointer"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="flex items-center border border-gray-200">
                <button
                  onClick={() => setPreviewTab("html")}
                  className={`px-3 py-1 font-bold cursor-pointer ${
                    previewTab === "html" ? "bg-[#1d4ed8] text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  HTML View
                </button>
                <button
                  onClick={() => setPreviewTab("text")}
                  className={`px-3 py-1 font-bold cursor-pointer ${
                    previewTab === "text" ? "bg-[#1d4ed8] text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Plain Text
                </button>
              </div>
            </div>

            {/* Subject preview */}
            <div className="py-2 text-xs font-mono border-b border-gray-200 shrink-0 text-slate-600">
              <span className="font-bold text-slate-900">Chủ đề:</span> {previewSubject}
            </div>

            {/* Render Area */}
            <div className="flex-1 overflow-auto p-4 bg-slate-50 mt-2 border border-gray-200">
              {previewTab === "html" ? (
                <iframe
                  title="Email HTML Preview"
                  srcDoc={previewHtml}
                  className="w-full h-full min-h-[500px] bg-white border border-gray-200"
                />
              ) : (
                <pre className="p-4 bg-white border border-gray-200 font-mono text-xs whitespace-pre-wrap text-slate-800">
                  {previewText}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SUPPRESSION LIST */}
      {suppressionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 max-w-lg w-full p-6 space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="font-bold uppercase text-sm tracking-tight text-slate-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-600" />
                Danh sách Chặn Email (Suppression List)
              </h3>
              <button
                onClick={() => setSuppressionModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Các địa chỉ trong danh sách này bị chặn gửi tự động nhằm bảo vệ uy tín tên miền (Hard Bounces, Complaints, Hủy đăng ký).
            </p>

            <div className="max-h-60 overflow-y-auto border border-gray-200 divide-y divide-gray-200 text-xs font-mono">
              {suppressions.length === 0 ? (
                <div className="p-4 text-center text-slate-500">Danh sách chặn hiện đang trống.</div>
              ) : (
                suppressions.map((s) => (
                  <div key={s.email} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-900">{s.email}</div>
                      <div className="text-[10px] text-slate-500">Lý do: {s.reason}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveSuppression(s.email)}
                      className="p-1 text-red-600 hover:text-red-900 border border-red-200 bg-red-50 hover:bg-red-100 cursor-pointer"
                      title="Gỡ chặn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSuppressionModalOpen(false)}
                className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-mono font-bold text-xs uppercase cursor-pointer transition-colors"
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
