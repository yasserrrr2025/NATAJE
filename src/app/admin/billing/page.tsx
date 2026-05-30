"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, CreditCard, FileText, Loader2, ReceiptText, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentSchoolId } from "@/lib/school-session";

type SchoolBilling = {
  id: string;
  name: string;
  subscription_plan: string | null;
  subscription_end_date: string | null;
};

type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
  features: string[] | null;
  is_popular: boolean | null;
};

type PaymentRow = {
  id: string;
  amount_paid: number;
  payment_status: string;
  payment_method: string | null;
  reference_number: string | null;
  created_at: string;
  subscription_packages?: { name: string | null } | { name: string | null }[] | null;
};

export default function SchoolBillingPage() {
  const [school, setSchool] = useState<SchoolBilling | null>(null);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBilling();
  }, []);

  const loadBilling = async () => {
    setLoading(true);
    const schoolId = getCurrentSchoolId();
    if (!schoolId) {
      setLoading(false);
      return;
    }

    const [schoolRes, packagesRes, paymentsRes] = await Promise.all([
      supabase
        .from("schools")
        .select("id, name, subscription_plan, subscription_end_date")
        .eq("id", schoolId)
        .maybeSingle(),
      supabase
        .from("subscription_packages")
        .select("id, name, description, price, duration_months, features, is_popular")
        .eq("is_active", true)
        .order("price"),
      supabase
        .from("subscription_payments")
        .select("id, amount_paid, payment_status, payment_method, reference_number, created_at, subscription_packages(name)")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
    ]);

    if (schoolRes.data) setSchool(schoolRes.data as SchoolBilling);
    if (packagesRes.data) setPackages(packagesRes.data as PackageRow[]);
    if (paymentsRes.data) setPayments(paymentsRes.data as PaymentRow[]);
    setLoading(false);
  };

  const subscriptionState = useMemo(() => {
    if (!school?.subscription_end_date) {
      return { label: "اشتراك غير محدد", color: "#64748b", days: null as number | null };
    }

    const end = new Date(school.subscription_end_date);
    const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
    if (days < 0) return { label: "منتهي", color: "#ef4444", days };
    if (days <= 14) return { label: "قارب على الانتهاء", color: "#f59e0b", days };
    return { label: "نشط", color: "#10b981", days };
  }, [school]);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: "55vh", flexDirection: "column", gap: "1rem" }}>
        <Loader2 className="animate-spin" size={42} style={{ color: "var(--primary)" }} />
        <p className="text-muted" style={{ fontWeight: 800 }}>جاري تحميل بيانات الاشتراك...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.5rem", color: "var(--primary)", fontWeight: 900 }}>Subscription Center</p>
          <h1 className="heading-2" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <ReceiptText size={32} style={{ color: "var(--primary)" }} />
            الاشتراك والفواتير
          </h1>
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>
            متابعة الباقة الحالية، تاريخ الانتهاء، سجل الفواتير، وتجديد الاشتراك من مكان واحد.
          </p>
        </div>
        <button onClick={loadBilling} style={secondaryButton}>
          <RefreshCw size={18} />
          تحديث
        </button>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1.2fr) minmax(260px, 0.8fr)", gap: "1rem" }} className="billing-hero-grid">
        <div style={panelStyle}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <span style={badge(subscriptionState.color)}>{subscriptionState.label}</span>
              <h2 style={{ margin: "1rem 0 0.5rem", fontSize: "1.8rem", fontWeight: 900 }}>{school?.subscription_plan || "TRIAL"}</h2>
              <p className="text-muted" style={{ margin: 0 }}>{school?.name}</p>
            </div>
            <span style={{ width: 54, height: 54, borderRadius: "1rem", background: `${subscriptionState.color}1A`, color: subscriptionState.color, display: "grid", placeItems: "center" }}>
              <ShieldCheck size={28} />
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginTop: "1.5rem" }}>
            <InfoTile
              icon={<CalendarClock size={22} />}
              label="تاريخ الانتهاء"
              value={school?.subscription_end_date ? new Date(school.subscription_end_date).toLocaleDateString("ar-SA") : "غير محدد"}
            />
            <InfoTile
              icon={<CheckCircle2 size={22} />}
              label="الأيام المتبقية"
              value={subscriptionState.days === null ? "-" : subscriptionState.days < 0 ? "منتهي" : `${subscriptionState.days} يوم`}
            />
          </div>
        </div>

        <div style={{ ...panelStyle, background: "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.08))" }}>
          <CreditCard size={32} style={{ color: "var(--primary)", marginBottom: "1rem" }} />
          <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 900 }}>تجديد سريع</h2>
          <p className="text-muted" style={{ margin: "0.75rem 0 1.25rem", lineHeight: 1.7 }}>
            اختر الباقة المناسبة، وسيتم تسجيل عملية الدفع وتحديث تاريخ الاشتراك تلقائياً بعد الاعتماد.
          </p>
          <Link href="/pricing" style={primaryButton}>
            عرض الباقات
          </Link>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: "1rem" }}>باقات التجديد المتاحة</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          {packages.map((pkg) => (
            <article key={pkg.id} style={{ ...panelStyle, padding: "1.2rem", position: "relative" }}>
              {pkg.is_popular && <span style={{ ...badge("#f59e0b"), position: "absolute", top: "1rem", left: "1rem" }}>الأكثر اختياراً</span>}
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900 }}>{pkg.name}</h3>
              <p className="text-muted" style={{ margin: "0.6rem 0 1rem", minHeight: 42 }}>{pkg.description || "باقة تشغيل مرنة لإدارة شهادات المدرسة."}</p>
              <strong style={{ display: "block", fontSize: "1.8rem", fontWeight: 900, color: "var(--primary)", marginBottom: "0.8rem" }}>
                {Number(pkg.price).toLocaleString("ar-SA")} ريال
              </strong>
              <p className="text-muted" style={{ marginBottom: "1rem" }}>لمدة {pkg.duration_months} شهر</p>
              <ul style={{ display: "grid", gap: "0.5rem", marginBottom: "1.25rem", listStyle: "none" }}>
                {(pkg.features || ["معالجة شهادات PDF", "بوابة استعلام للطلاب", "تقارير متابعة"]).slice(0, 4).map((feature) => (
                  <li key={feature} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
                    <CheckCircle2 size={16} style={{ color: "var(--accent)" }} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href={`/checkout?plan=${pkg.id}`} style={{ ...primaryButton, width: "100%", justifyContent: "center" }}>
                تجديد بهذه الباقة
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--secondary)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <FileText size={22} style={{ color: "var(--primary)" }} />
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900 }}>الفواتير والمدفوعات</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", textAlign: "right" }}>
            <thead style={{ background: "var(--secondary)" }}>
              <tr>
                {["المرجع", "الباقة", "المبلغ", "طريقة الدفع", "الحالة", "التاريخ"].map((header) => (
                  <th key={header} style={thStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem", textAlign: "center" }} className="text-muted">
                    لا توجد فواتير مسجلة بعد.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const pkg = normalizePackage(payment.subscription_packages);
                  return (
                    <tr key={payment.id} style={{ borderBottom: "1px solid var(--secondary)" }}>
                      <td style={tdStyle}>{payment.reference_number || payment.id.slice(0, 8)}</td>
                      <td style={tdStyle}>{pkg?.name || "-"}</td>
                      <td style={tdStyle}>{Number(payment.amount_paid).toLocaleString("ar-SA")} ريال</td>
                      <td style={tdStyle}>{methodLabel(payment.payment_method)}</td>
                      <td style={tdStyle}><span style={badge(statusColor(payment.payment_status))}>{statusLabel(payment.payment_status)}</span></td>
                      <td style={tdStyle}>{new Date(payment.created_at).toLocaleDateString("ar-SA")}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .billing-hero-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: "var(--background)", border: "1px solid var(--secondary)", borderRadius: "0.9rem", padding: "1rem" }}>
      <span style={{ display: "inline-flex", color: "var(--primary)", marginBottom: "0.6rem" }}>{icon}</span>
      <p className="text-muted" style={{ margin: 0, fontWeight: 800 }}>{label}</p>
      <strong style={{ display: "block", marginTop: "0.4rem", fontSize: "1.05rem" }}>{value}</strong>
    </div>
  );
}

function normalizePackage(pkg: PaymentRow["subscription_packages"]) {
  if (!pkg) return null;
  return Array.isArray(pkg) ? pkg[0] : pkg;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PAID: "مدفوعة",
    PENDING: "قيد المراجعة",
    FAILED: "فشلت",
    REFUNDED: "مستردة",
  };
  return labels[status] || status;
}

function statusColor(status: string) {
  const colors: Record<string, string> = {
    PAID: "#10b981",
    PENDING: "#f59e0b",
    FAILED: "#ef4444",
    REFUNDED: "#8b5cf6",
  };
  return colors[status] || "#64748b";
}

function methodLabel(method: string | null) {
  const labels: Record<string, string> = {
    CREDIT_CARD: "بطاقة",
    BANK_TRANSFER: "تحويل بنكي",
    MADA: "مدى",
    APPLE_PAY: "Apple Pay",
  };
  return method ? labels[method] || method : "-";
}

function badge(color: string): React.CSSProperties {
  return {
    color,
    background: `${color}1A`,
    border: `1px solid ${color}33`,
    borderRadius: "999px",
    padding: "0.35rem 0.75rem",
    fontWeight: 900,
    fontSize: "0.85rem",
    whiteSpace: "nowrap",
    display: "inline-flex",
    width: "fit-content",
  };
}

const panelStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--card-border)",
  borderRadius: "1rem",
  boxShadow: "var(--shadow-lg)",
  padding: "1.25rem",
};

const primaryButton: React.CSSProperties = {
  minHeight: 44,
  borderRadius: "0.85rem",
  border: "none",
  background: "var(--primary)",
  color: "white",
  padding: "0 1rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: "var(--secondary)",
  color: "var(--foreground)",
};

const thStyle: React.CSSProperties = {
  padding: "1rem 1.2rem",
  fontWeight: 900,
  color: "var(--foreground)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "1rem 1.2rem",
  verticalAlign: "middle",
  fontWeight: 700,
};
