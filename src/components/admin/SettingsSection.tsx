"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Settings,
  Save,
  RotateCw,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ShieldCheck,
  Bot,
  Mail,
  Zap,
} from "lucide-react";

interface AdminSettingsState {
  crawlerConcurrency: number;
  crawlerRateLimitMs: number;
  duplicateThreshold: number;
  autoApproveVerifiedDomain: boolean;
  moderationNoticeEmail: string;
  maintenanceMode: boolean;
}

const DEFAULT_SETTINGS: AdminSettingsState = {
  crawlerConcurrency: 5,
  crawlerRateLimitMs: 1500,
  duplicateThreshold: 0.85,
  autoApproveVerifiedDomain: true,
  moderationNoticeEmail: "dungpubgame@gmail.com",
  maintenanceMode: false,
};

export function SettingsSection() {
  const [settings, setSettings] = useState<AdminSettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (json.success && json.settings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...json.settings,
        });
      } else {
        setErrorMsg(json.error || "Không thể tải cấu hình.");
      }
    } catch (err) {
      setErrorMsg("Lỗi kết nối khi tải cấu hình hệ thống.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMsg("Cấu hình hệ thống đã được cập nhật thành công và ghi nhận vào nhật ký kiểm toán.");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(json.error || "Lỗi lưu cấu hình.");
      }
    } catch {
      setErrorMsg("Lỗi đường truyền khi lưu cấu hình.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <RotateCw className="w-8 h-8 animate-spin text-gray-900" />
        <span className="text-xs uppercase font-mono tracking-widest text-gray-500">
          Đang tải thông số cấu hình hệ thống...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-gray-900">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-gray-950 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-900" />
            <span>Cấu hình Tham số Vận hành Toàn hệ thống (Global Settings)</span>
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Điều chỉnh tham số thu thập tự động, thuật toán rà soát trùng lặp và email nhận thông báo quản trị
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-xs font-bold uppercase transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-600 text-emerald-950 flex items-center gap-3 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border-2 border-red-600 text-red-950 flex items-center gap-3 text-xs font-semibold animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Crawler Settings */}
        <div className="bg-white border-2 border-gray-900 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-600" />
              <span>Chính sách Thu thập Dữ liệu Lịch sự (Polite Crawling Engine)</span>
            </h3>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-mono text-[10px] font-bold">
              EDU.VN
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                Số luồng thu thập đồng thời (Worker Concurrency)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={settings.crawlerConcurrency}
                onChange={(e) =>
                  setSettings({ ...settings, crawlerConcurrency: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs border border-gray-300 focus:border-gray-900 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Khuyến nghị từ 3 - 8 luồng nhằm tránh làm nghẽn băng thông cổng thông tin các trường đại học.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                Khoảng cách giãn cách giữa 2 yêu cầu (Delay Interval ms)
              </label>
              <input
                type="number"
                min={300}
                max={10000}
                step={100}
                value={settings.crawlerRateLimitMs}
                onChange={(e) =>
                  setSettings({ ...settings, crawlerRateLimitMs: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs border border-gray-300 focus:border-gray-900 focus:outline-none font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Mặc định 1.500 ms (1,5 giây). Tuân thủ nguyên tắc thu thập không xâm lấn.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Data Quality & Duplicates Threshold */}
        <div className="bg-white border-2 border-gray-900 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>Độ nhạy Phát hiện Trùng lặp (Duplicate Detection Algorithm)</span>
            </h3>
            <span className="font-mono text-xs font-bold text-gray-600">
              Ngưỡng: {(settings.duplicateThreshold * 100).toFixed(0)}%
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                Hệ số tương đồng Jaro-Winkler / Levenshtein ({settings.duplicateThreshold})
              </label>
              <input
                type="range"
                min="0.50"
                max="0.99"
                step="0.01"
                value={settings.duplicateThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, duplicateThreshold: parseFloat(e.target.value) })
                }
                className="w-full accent-gray-900"
              />
              <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                <span>0.50 (Bắt rất rộng, nhiều trùng giả)</span>
                <span>0.85 (Khuyến nghị chuẩn)</span>
                <span>0.99 (Chỉ bắt tên gần như tuyệt đối)</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="autoApprove"
                checked={settings.autoApproveVerifiedDomain}
                onChange={(e) =>
                  setSettings({ ...settings, autoApproveVerifiedDomain: e.target.checked })
                }
                className="w-4 h-4 text-gray-900 rounded-none border-gray-400 focus:ring-0"
              />
              <label htmlFor="autoApprove" className="text-xs font-semibold text-gray-800 cursor-pointer">
                Tự động gán nhãn uy tín cho các giảng viên có email hoặc đường dẫn từ tên miền trường đại học chính thức (.edu.vn)
              </label>
            </div>
          </div>
        </div>

        {/* Card 3: Notifications & System Control */}
        <div className="bg-white border-2 border-gray-900 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-600" />
              <span>Thông báo & Trạng thái Hệ thống</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                Email nhận cảnh báo kiểm duyệt & báo cáo khẩn
              </label>
              <input
                type="email"
                value={settings.moderationNoticeEmail}
                onChange={(e) =>
                  setSettings({ ...settings, moderationNoticeEmail: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-gray-300 focus:border-gray-900 focus:outline-none"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Hệ thống sẽ gửi cảnh báo khi có trên 10 báo cáo sai phạm trong vòng 1 giờ.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                Chế độ Bảo trì (Maintenance Mode)
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="maintMode"
                  checked={settings.maintenanceMode}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenanceMode: e.target.checked })
                  }
                  className="w-4 h-4 text-red-600 rounded-none border-gray-400 focus:ring-0"
                />
                <label htmlFor="maintMode" className="text-xs font-bold text-red-900 cursor-pointer">
                  Kích hoạt chế độ bảo trì toàn bộ website (chỉ Super Admin mới truy cập được)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="pt-2 flex items-center justify-between">
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Mọi thay đổi cấu hình được lưu vào bảng Cloud SQL `admin_settings` và kiểm toán bất biến.</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {saving ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? "Đang lưu cấu hình..." : "Lưu Thay Đổi"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
