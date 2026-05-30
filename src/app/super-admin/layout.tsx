"use client";

import {
  Activity,
  Building2,
  CreditCard,
  LifeBuoy,
  LayoutDashboard,
  LogOut,
  Settings,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CENTRAL_ADMIN_SESSION_KEY = "central_admin_session";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/super-admin/login";
  const [isReady, setIsReady] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isLoginPage) {
      setIsAuthorized(true);
      setIsReady(true);
      return;
    }

    const session = window.localStorage.getItem(CENTRAL_ADMIN_SESSION_KEY);
    if (!session) {
      router.replace("/super-admin/login");
      return;
    }

    setIsAuthorized(true);
    setIsReady(true);
  }, [isLoginPage, router]);

  const handleLogout = () => {
    window.localStorage.removeItem(CENTRAL_ADMIN_SESSION_KEY);
    router.replace("/super-admin/login");
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!isReady || !isAuthorized) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a" }} />
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
      <aside style={{ width: "280px", background: "#1e293b", borderLeft: "1px solid #334155", padding: "2rem 1rem", display: "flex", flexDirection: "column", gap: "2rem", color: "#f8fafc" }}>
        <div style={{ padding: "0 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Activity size={24} style={{ color: "#38bdf8" }} />
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "white", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>الإدارة المركزية</h2>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Link href="/super-admin" className="super-hover-bg" style={navItemStyle}>
            <LayoutDashboard size={20} style={{ color: "#38bdf8" }} />
            لوحة المراقبة
          </Link>
          <Link href="/super-admin/schools" className="super-hover-bg" style={navItemStyle}>
            <Building2 size={20} style={{ color: "#a78bfa" }} />
            إدارة المدارس
          </Link>
          <Link href="/super-admin/packages" className="super-hover-bg" style={navItemStyle}>
            <Activity size={20} style={{ color: "#fbbf24" }} />
            الباقات والاشتراكات
          </Link>
          <Link href="/super-admin/subscriptions" className="super-hover-bg" style={navItemStyle}>
            <CreditCard size={20} style={{ color: "#34d399" }} />
            الاشتراكات والمدفوعات
          </Link>
          <Link href="/super-admin/coupons" className="super-hover-bg" style={navItemStyle}>
            <Ticket size={20} style={{ color: "#fbbf24" }} />
            عروض الخصم
          </Link>
          <Link href="/super-admin/support" className="super-hover-bg" style={navItemStyle}>
            <LifeBuoy size={20} style={{ color: "#22d3ee" }} />
            مركز الدعم
          </Link>
          <Link href="/super-admin/settings" className="super-hover-bg" style={navItemStyle}>
            <Settings size={20} style={{ color: "#94a3b8" }} />
            إعدادات المنصة
          </Link>
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          style={{ ...navItemStyle, marginTop: "auto", background: "rgba(239, 68, 68, 0.1)", color: "#fecaca", border: "1px solid rgba(239, 68, 68, 0.2)" }}
        >
          <LogOut size={20} />
          تسجيل الخروج
        </button>

        <style>{`
          .super-hover-bg:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white !important;
          }
        `}</style>
      </aside>

      <main style={{ flex: 1, padding: "2rem", overflowY: "auto", background: "#0f172a", color: "white" }}>
        {children}
      </main>
    </div>
  );
}

const navItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  padding: "1rem",
  borderRadius: "0.75rem",
  transition: "background 0.2s",
  fontWeight: 600,
  color: "#e2e8f0",
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
} as const;
