"use client";

import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PopArtLayoutDashboard,
  PopArtUsers,
  PopArtGraduationCap,
  PopArtBuilding,
  PopArtBook,
  PopArtGitMerge,
  PopArtBot,
  PopArtMessageSquare,
  PopArtFileText,
  PopArtActivity,
  PopArtSettings,
  PopArtSearch,
  PopArtExternalLink,
  PopArtLogOut,
  PopArtMenu,
  PopArtX,
  PopArtShield,
  PopArtShieldCheck,
  PopArtChevronRight,
  PopArtAward,
  PopArtAlertTriangle,
  PopArtMail,
  PopArtScale,
} from "@/components/icons/PopArtIcons";

import dynamic from "next/dynamic";
import { OverviewSection } from "./OverviewSection";

const AdminSectionLoading = () => (
  <div className="flex items-center justify-center p-12 text-gray-500 font-mono text-sm">
    <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent mr-3" />
    Đang tải phân hệ...
  </div>
);

const GlobalSearchModal = dynamic(() => import("./GlobalSearchModal").then((m) => m.GlobalSearchModal));
const UsersSection = dynamic(() => import("./UsersSection").then((m) => m.UsersSection), { loading: AdminSectionLoading });
const AppealsSection = dynamic(() => import("./AppealsSection").then((m) => m.AppealsSection), { loading: AdminSectionLoading });
const LecturersSection = dynamic(() => import("./LecturersSection").then((m) => m.LecturersSection), { loading: AdminSectionLoading });
const UniversitiesSection = dynamic(() => import("./UniversitiesSection").then((m) => m.UniversitiesSection), { loading: AdminSectionLoading });
const FacultiesSection = dynamic(() => import("./FacultiesSection").then((m) => m.FacultiesSection), { loading: AdminSectionLoading });
const DataQualitySection = dynamic(() => import("./DataQualitySection").then((m) => m.DataQualitySection), { loading: AdminSectionLoading });
const CrawlerSection = dynamic(() => import("./CrawlerSection").then((m) => m.CrawlerSection), { loading: AdminSectionLoading });
const ModerationSection = dynamic(() => import("./ModerationSection").then((m) => m.ModerationSection), { loading: AdminSectionLoading });
const AuditLogsSection = dynamic(() => import("./AuditLogsSection").then((m) => m.AuditLogsSection), { loading: AdminSectionLoading });
const SystemHealthSection = dynamic(() => import("./SystemHealthSection").then((m) => m.SystemHealthSection), { loading: AdminSectionLoading });
const SettingsSection = dynamic(() => import("./SettingsSection").then((m) => m.SettingsSection), { loading: AdminSectionLoading });
const MoetRegistrySection = dynamic(() => import("./MoetRegistrySection").then((m) => m.MoetRegistrySection), { loading: AdminSectionLoading });
const EmailSection = dynamic(() => import("./EmailSection").then((m) => m.EmailSection), { loading: AdminSectionLoading });
const InboxSection = dynamic(() => import("./InboxSection").then((m) => m.InboxSection), { loading: AdminSectionLoading });

export type AdminSectionKey =
  | "overview"
  | "inbox"
  | "users"
  | "appeals"
  | "lecturers"
  | "universities"
  | "moet"
  | "faculties"
  | "quality"
  | "crawler"
  | "moderation"
  | "audit"
  | "health"
  | "settings"
  | "email";

interface AdminUserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: "super_admin" | "admin" | "moderator" | "support" | "security" | "student";
}

interface AdminLayoutProps {
  initialUser?: AdminUserSession | null;
  lang?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AdminErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AdminErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 border-2 border-red-500 bg-red-50 text-red-950 space-y-4 my-4">
          <div className="flex items-center gap-3">
            <PopArtAlertTriangle className="w-6 h-6 shrink-0" />
            <h3 className="text-base font-black uppercase tracking-wider">
              Đã xảy ra sự cố khi hiển thị phân hệ Quản trị này
            </h3>
          </div>
          <p className="text-xs text-gray-700 font-mono">
            {this.state.error?.message || "Lỗi không xác định."}
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase transition-colors"
            >
              Thử lại phân hệ này
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white border border-gray-400 hover:bg-gray-100 text-gray-900 text-xs font-bold uppercase transition-colors"
            >
              Tải lại toàn bộ trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AdminLayout({ initialUser, lang = "vi" }: AdminLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section") as AdminSectionKey | null;

  const defaultSection: AdminSectionKey =
    initialUser?.role === "support" || initialUser?.role === "security"
      ? "inbox"
      : "overview";
  const [activeSection, setActiveSection] = useState<AdminSectionKey>(
    sectionParam || defaultSection
  );
  const [user, setUser] = useState<AdminUserSession | null>(initialUser || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Sync state if query param changes
  useEffect(() => {
    if (sectionParam && sectionParam !== activeSection) {
      setActiveSection(sectionParam);
    }
  }, [sectionParam, activeSection]);

  // Fetch current session if not provided
  useEffect(() => {
    if (!user) {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data) => {
          if (data.user) {
            const role = data.user.role || "student";
            setUser({
              uid: data.user.uid,
              email: data.user.email,
              displayName: data.user.displayName,
              photoURL: data.user.photoURL,
              role,
            });
            if ((role === "support" || role === "security") && !sectionParam) {
              setActiveSection("inbox");
            }
          }
        })
        .catch((err) => console.error("Error fetching session:", err));
    }
  }, [user, sectionParam]);

  // Hotkey for Global Search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigateTo = useCallback(
    (key: AdminSectionKey) => {
      setActiveSection(key);
      setSidebarOpen(false);
      const url = new URL(window.location.href);
      url.searchParams.set("section", key);
      window.history.pushState({}, "", url.toString());
    },
    []
  );

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push(`/${lang}`);
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = `/${lang}`;
    }
  };

  const navItems = [
    {
      key: "overview" as AdminSectionKey,
      label: "Trung tâm Điều hành",
      icon: PopArtLayoutDashboard,
      badge: null,
    },
    {
      key: "inbox" as AdminSectionKey,
      label: "Hộp thư Đến (Inbox)",
      icon: PopArtMail,
      badge: "Inbound",
    },
    {
      key: "users" as AdminSectionKey,
      label: "Tài khoản Người dùng",
      icon: PopArtUsers,
      badge: null,
    },
    {
      key: "appeals" as AdminSectionKey,
      label: "Kháng nghị Khóa",
      icon: PopArtScale,
      badge: null,
    },
    {
      key: "lecturers" as AdminSectionKey,
      label: "Hồ sơ Giảng viên",
      icon: PopArtGraduationCap,
      badge: "86K+",
    },
    {
      key: "universities" as AdminSectionKey,
      label: "Cơ sở Đại học",
      icon: PopArtBuilding,
      badge: "327",
    },
    {
      key: "moet" as AdminSectionKey,
      label: "Danh mục MOET",
      icon: PopArtAward,
      badge: "327 CSGD",
    },
    {
      key: "faculties" as AdminSectionKey,
      label: "Khoa & Bộ môn",
      icon: PopArtBook,
      badge: null,
    },
    {
      key: "quality" as AdminSectionKey,
      label: "Rà soát & Trùng lặp",
      icon: PopArtGitMerge,
      badge: "ACID",
    },
    {
      key: "crawler" as AdminSectionKey,
      label: "Thu thập Tự động",
      icon: PopArtBot,
      badge: "Polite",
    },
    {
      key: "moderation" as AdminSectionKey,
      label: "Kiểm duyệt Đánh giá",
      icon: PopArtMessageSquare,
      badge: null,
    },
    {
      key: "audit" as AdminSectionKey,
      label: "Nhật ký Kiểm toán",
      icon: PopArtFileText,
      badge: null,
    },
    {
      key: "health" as AdminSectionKey,
      label: "Sức khỏe Hệ thống",
      icon: PopArtActivity,
      badge: "Live",
    },
    {
      key: "settings" as AdminSectionKey,
      label: "Cấu hình Hệ thống",
      icon: PopArtSettings,
      badge: null,
    },
    {
      key: "email" as AdminSectionKey,
      label: "Quản trị Email",
      icon: PopArtMail,
      badge: "Outbox",
    },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!user) return true;
    if (user.role === "support" || user.role === "security") {
      return item.key === "inbox";
    }
    if (user.role === "moderator") {
      return ["overview", "moderation", "lecturers", "universities", "faculties", "quality", "crawler", "health"].includes(item.key);
    }
    return true;
  });

  const getActiveTitle = () => {
    const item = navItems.find((n) => n.key === activeSection);
    return item ? item.label : "Quản trị";
  };

  const getRoleBadge = (role?: string) => {
    if (role === "super_admin") {
      return (
        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
          Super Admin
        </span>
      );
    }
    if (role === "admin") {
      return (
        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
          Admin
        </span>
      );
    }
    if (role === "moderator") {
      return (
        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300">
          Moderator
        </span>
      );
    }
    if (role === "support") {
      return (
        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
          Support Team
        </span>
      );
    }
    if (role === "security") {
      return (
        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-900 border border-red-300">
          Security Team
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-800 border border-gray-300">
        {role || "Admin"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex flex-col font-sans text-gray-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 bg-white border-b-2 border-gray-900 h-14 flex items-center justify-between px-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="lg:hidden p-1.5 text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <PopArtX className="w-5 h-5" /> : <PopArtMenu className="w-5 h-5" />}
          </button>

          <Link
            href={`/${lang}`}
            className="flex items-center gap-2 font-black text-sm uppercase tracking-tight text-gray-950 hover:text-[#e03a3e] transition-colors"
          >
            <span className="px-2 py-0.5 bg-gray-900 text-white font-mono text-xs">RUP</span>
            <span className="hidden sm:inline">RateUrProfs</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#e03a3e] bg-red-50 border border-red-200 px-1.5 py-0.2">
              ADMIN OPS
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 pl-3 border-l border-gray-200">
            <span>Bảng quản trị</span>
            <PopArtChevronRight className="w-3.5 h-3.5" />
            <span className="font-bold text-gray-800">{getActiveTitle()}</span>
          </div>
        </div>

        {/* Search Bar + User + Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-950 text-xs border border-gray-300 transition-colors rounded-none"
            title="Tìm kiếm toàn hệ thống (Ctrl+K)"
          >
            <PopArtSearch className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tìm kiếm nhanh...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-white border border-gray-300 text-[10px] font-mono font-bold text-gray-500">
              Ctrl+K
            </kbd>
          </button>

          <Link
            href={`/${lang}`}
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 hover:text-gray-950 hover:bg-gray-100 transition-colors"
          >
            <span>Trang chủ</span>
            <PopArtExternalLink className="w-3 h-3" />
          </Link>

          {/* User profile badge & logout */}
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold text-gray-900 max-w-[130px] truncate" title={user?.email || ""}>
                {user?.displayName || user?.email?.split("@")[0] || "Admin"}
              </span>
              <div>{getRoleBadge(user?.role)}</div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Đăng xuất khỏi Bảng điều khiển Quản trị"
            >
              <PopArtLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Overlay on Mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-black/40 lg:hidden backdrop-blur-xs"
          />
        )}

        {/* Sidebar Navigation */}
        <aside
          className={`fixed lg:static top-14 bottom-0 left-0 z-25 w-64 bg-white border-r-2 border-gray-900 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Nav Links */}
          <nav className="p-3 space-y-1 overflow-y-auto flex-1">
            <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">
              Hệ thống Vận hành
            </div>
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => navigateTo(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition-colors text-left ${
                    isActive
                      ? "bg-gray-900 text-white font-black"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-950"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#e03a3e]" : "text-gray-500"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.2 text-[9px] font-mono font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer Info */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-500 space-y-1 font-mono">
            <div className="flex items-center gap-1.5 text-gray-700 font-bold">
              <PopArtShieldCheck className="w-4 h-4" />
              <span>Cloud SQL &amp; Cloud Run</span>
            </div>
            <div>Bảo mật: Google OAuth 2.0</div>
            <div className="text-[10px] text-gray-400 pt-1">RateUrProfs Platform v2.5</div>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <AdminErrorBoundary key={activeSection}>
            {activeSection === "overview" && <OverviewSection onNavigate={(s) => navigateTo(s as AdminSectionKey)} />}
            {activeSection === "inbox" && <InboxSection />}
            {activeSection === "users" && <UsersSection />}
            {activeSection === "appeals" && <AppealsSection />}
            {activeSection === "lecturers" && <LecturersSection />}
            {activeSection === "universities" && <UniversitiesSection />}
            {activeSection === "moet" && <MoetRegistrySection />}
            {activeSection === "faculties" && <FacultiesSection />}
            {activeSection === "quality" && <DataQualitySection />}
            {activeSection === "crawler" && <CrawlerSection />}
            {activeSection === "moderation" && <ModerationSection lang={lang} />}
            {activeSection === "audit" && <AuditLogsSection />}
            {activeSection === "health" && <SystemHealthSection />}
            {activeSection === "settings" && <SettingsSection />}
            {activeSection === "email" && <EmailSection />}
          </AdminErrorBoundary>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(section: string) => {
          navigateTo(section as AdminSectionKey);
          setSearchOpen(false);
        }}
      />
    </div>
  );
}
