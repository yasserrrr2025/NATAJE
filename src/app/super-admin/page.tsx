"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type School = {
  id: string;
  name: string;
  ministerial_number: string | null;
  subscription_plan: string | null;
  subscription_end_date: string | null;
  is_active: boolean | null;
  created_at: string;
};

type Payment = {
  id: string;
  amount_paid: number;
  payment_status: string;
  created_at: string;
  schools?: { name: string | null } | null;
  subscription_packages?: { name: string | null } | null;
};

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [packagesCount, setPackagesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [schoolsRes, paymentsRes, packagesRes] = await Promise.all([
        supabase.from("schools").select("id, name, ministerial_number, subscription_plan, subscription_end_date, is_active, created_at").order("created_at", { ascending: false }),
        supabase.from("subscription_payments").select("id, amount_paid, payment_status, created_at, schools(name), subscription_packages(name)").order("created_at", { ascending: false }).limit(8),
        supabase.from("subscription_packages").select("id", { count: "exact", head: true }),
      ]);

      if (schoolsRes.data) setSchools(schoolsRes.data as School[]);
      if (paymentsRes.data) {
        setPayments(
          paymentsRes.data.map((payment) => ({
            ...payment,
            schools: Array.isArray(payment.schools) ? payment.schools[0] : payment.schools,
            subscription_packages: Array.isArray(payment.subscription_packages)
              ? payment.subscription_packages[0]
              : payment.subscription_packages,
          })) as Payment[],
        );
      }
      setPackagesCount(packagesRes.count || 0);
      setLoading(false);
    }

    loadData();
  }, []);

  const stats = useMemo(() => {
    const activeSchools = schools.filter((school) => school.is_active !== false);
    const expiredSchools = schools.filter((school) => school.subscription_end_date && new Date(school.subscription_end_date) < new Date());
    const paidRevenue = payments
      .filter((payment) => payment.payment_status === "PAID")
      .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);

    return {
      totalSchools: schools.length,
      activeSchools: activeSchools.length,
      expiredSchools: expiredSchools.length,
      paidRevenue,
      pendingPayments: payments.filter((payment) => payment.payment_status === "PENDING").length,
    };
  }, [schools, payments]);

  const exportFinancialReport = () => {
    const rows = [
      ["operation_id", "school", "package", "status", "amount", "created_at"],
      ...payments.map((payment) => [
        payment.id,
        payment.schools?.name || "",
        payment.subscription_packages?.name || "",
        payment.payment_status,
        String(payment.amount_paid || 0),
        payment.created_at,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ntaje-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.5rem", color: "#38bdf8", fontWeight: 900 }}>NTAJE Command Center</p>
          <h1 style={{ margin: 0, color: "white", fontSize: "2.1rem", fontWeight: 900 }}>الإدارة المركزية</h1>
          <p style={{ margin: "0.65rem 0 0", color: "#94a3b8", maxWidth: 760 }}>
            متابعة المدارس، الإيرادات، الدفعات المعلقة، وحالة الاشتراكات من مكان واحد.
          </p>
        </div>
        <button onClick={exportFinancialReport} style={primaryButton}>
          <Download size={18} />
          تصدير مالي
        </button>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem" }}>
        <Metric icon={<Building2 size={22} />} label="إجمالي المدارس" value={loading ? "..." : stats.totalSchools.toString()} color="#38bdf8" />
        <Metric icon={<CheckCircle size={22} />} label="مدارس مفعلة" value={loading ? "..." : stats.activeSchools.toString()} color="#10b981" />
        <Metric icon={<Clock size={22} />} label="اشتراكات منتهية" value={loading ? "..." : stats.expiredSchools.toString()} color="#fbbf24" />
        <Metric icon={<TrendingUp size={22} />} label="إيراد آخر العمليات" value={loading ? "..." : `${formatMoney(stats.paidRevenue)} ريال`} color="#a78bfa" />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <QuickAction href="/super-admin/schools" icon={<Building2 size={22} />} title="إدارة المدارس" caption="إضافة مدرسة، واتساب، تعطيل وتفعيل" />
        <QuickAction href="/super-admin/subscriptions" icon={<CreditCard size={22} />} title="الاشتراكات والمدفوعات" caption={`${stats.pendingPayments} دفعات قيد المراجعة`} />
        <QuickAction href="/super-admin/packages" icon={<Users size={22} />} title="باقات المنصة" caption={`${packagesCount} باقات متاحة`} />
        <QuickAction href="/super-admin/settings" icon={<Settings size={22} />} title="إعدادات المنصة" caption="قوالب واتساب والدعم والفواتير" />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.7fr)", gap: "1rem" }}>
        <div style={panelStyle}>
          <PanelHeader title="أحدث المدارس" href="/super-admin/schools" />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", minWidth: 620 }}>
              <thead>
                <tr>
                  {["المدرسة", "الباقة", "تاريخ التسجيل", "الحالة"].map((header) => (
                    <th key={header} style={thStyle}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schools.slice(0, 6).map((school) => (
                  <tr key={school.id} style={{ borderTop: "1px solid #334155" }}>
                    <td style={tdStyle}>
                      <strong style={{ color: "white", display: "block" }}>{school.name}</strong>
                      <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{school.ministerial_number || "-"}</span>
                    </td>
                    <td style={tdStyle}><span style={badge("#38bdf8")}>{school.subscription_plan || "TRIAL"}</span></td>
                    <td style={tdStyle}>{new Date(school.created_at).toLocaleDateString("ar-SA")}</td>
                    <td style={tdStyle}><span style={badge(school.is_active === false ? "#ef4444" : "#10b981")}>{school.is_active === false ? "معطلة" : "مفعلة"}</span></td>
                  </tr>
                ))}
                {!loading && schools.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: "2.5rem", color: "#64748b", textAlign: "center" }}>لا توجد مدارس حتى الآن.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={panelStyle}>
          <PanelHeader title="آخر الدفعات" href="/super-admin/subscriptions" />
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {payments.slice(0, 5).map((payment) => (
              <div key={payment.id} style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "0.9rem", padding: "0.9rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                  <strong style={{ color: "white" }}>{payment.schools?.name || "مدرسة غير موجودة"}</strong>
                  <span style={badge(payment.payment_status === "PAID" ? "#10b981" : payment.payment_status === "PENDING" ? "#fbbf24" : "#ef4444")}>
                    {payment.payment_status === "PAID" ? "مدفوعة" : payment.payment_status === "PENDING" ? "مراجعة" : "غير مكتملة"}
                  </span>
                </div>
                <p style={{ margin: "0.5rem 0 0", color: "#94a3b8" }}>
                  {payment.subscription_packages?.name || "باقة"} - {formatMoney(payment.amount_paid)} ريال
                </p>
              </div>
            ))}
            {!loading && payments.length === 0 && <p style={{ color: "#64748b", textAlign: "center", margin: "2rem 0" }}>لا توجد دفعات مسجلة.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "1rem", padding: "1.25rem" }}>
      <div style={{ width: 42, height: 42, borderRadius: "0.85rem", background: `${color}1A`, color, display: "grid", placeItems: "center", marginBottom: "0.9rem" }}>
        {icon}
      </div>
      <p style={{ margin: 0, color: "#94a3b8", fontWeight: 800 }}>{label}</p>
      <strong style={{ display: "block", marginTop: "0.65rem", color: "white", fontSize: "1.65rem", fontWeight: 900 }}>{value}</strong>
    </div>
  );
}

function QuickAction({ href, icon, title, caption }: { href: string; icon: React.ReactNode; title: string; caption: string }) {
  return (
    <Link href={href} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "1rem", padding: "1.1rem", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
        <span style={{ width: 42, height: 42, borderRadius: "0.85rem", background: "rgba(56,189,248,0.12)", color: "#38bdf8", display: "grid", placeItems: "center" }}>{icon}</span>
        <span>
          <strong style={{ color: "white", display: "block", marginBottom: "0.3rem" }}>{title}</strong>
          <small style={{ color: "#94a3b8", fontWeight: 700 }}>{caption}</small>
        </span>
      </div>
      <ArrowLeft size={18} style={{ color: "#64748b", flex: "0 0 auto" }} />
    </Link>
  );
}

function PanelHeader({ title, href }: { title: string; href: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
      <h2 style={{ margin: 0, color: "white", fontSize: "1.2rem", fontWeight: 900 }}>{title}</h2>
      <Link href={href} style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 900 }}>عرض الكل</Link>
    </div>
  );
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("ar-SA");
}

function badge(color: string): React.CSSProperties {
  return {
    background: `${color}1A`,
    color,
    padding: "0.35rem 0.75rem",
    borderRadius: "999px",
    fontSize: "0.85rem",
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

const panelStyle = { background: "#1e293b", border: "1px solid #334155", borderRadius: "1rem", padding: "1.25rem", overflow: "hidden" } as const;
const thStyle = { padding: "0.75rem 0.85rem", color: "#94a3b8", fontWeight: 900, whiteSpace: "nowrap" } as const;
const tdStyle = { padding: "0.9rem 0.85rem", color: "#cbd5e1", verticalAlign: "top" } as const;
const primaryButton = {
  minHeight: 46,
  padding: "0 1.15rem",
  borderRadius: "0.85rem",
  border: "none",
  background: "#38bdf8",
  color: "#0f172a",
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.6rem",
  cursor: "pointer",
} as const;
