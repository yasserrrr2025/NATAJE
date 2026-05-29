"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type School = {
  id: string;
  name: string;
  ministerial_number: string | null;
  subscription_plan: string | null;
  subscription_end_date: string | null;
};

type Package = {
  id: string;
  name: string;
  price: number;
  duration_months: number | null;
  is_active?: boolean | null;
};

type Payment = {
  id: string;
  school_id: string;
  package_id: string;
  amount_paid: number;
  payment_status: string;
  payment_method: string;
  reference_number: string | null;
  created_at: string;
  schools?: Pick<School, "name" | "ministerial_number"> | null;
  subscription_packages?: Pick<Package, "name" | "duration_months"> | null;
};

const emptyForm = {
  school_id: "",
  package_id: "",
  amount_paid: 0,
  payment_status: "PAID",
  payment_method: "BANK_TRANSFER",
  reference_number: "",
};

export default function SubscriptionsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [paymentsRes, schoolsRes, packagesRes] = await Promise.all([
      supabase
        .from("subscription_payments")
        .select("*, schools(name, ministerial_number), subscription_packages(name, duration_months)")
        .order("created_at", { ascending: false }),
      supabase.from("schools").select("id, name, ministerial_number, subscription_plan, subscription_end_date").order("name"),
      supabase.from("subscription_packages").select("id, name, price, duration_months, is_active").order("price"),
    ]);

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
    if (schoolsRes.data) setSchools(schoolsRes.data as School[]);
    if (packagesRes.data) setPackages(packagesRes.data as Package[]);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const paid = payments.filter((payment) => payment.payment_status === "PAID");
    const now = new Date();
    return {
      paidRevenue: paid.reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0),
      paidCount: paid.length,
      pendingCount: payments.filter((payment) => payment.payment_status === "PENDING").length,
      monthRevenue: paid
        .filter((payment) => {
          const date = new Date(payment.created_at);
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        })
        .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0),
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesStatus = statusFilter === "ALL" || payment.payment_status === statusFilter;
      const matchesSearch = !cleanQuery || [payment.schools?.name, payment.schools?.ministerial_number, payment.reference_number, payment.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(cleanQuery));
      return matchesStatus && matchesSearch;
    });
  }, [payments, query, statusFilter]);

  const openModal = () => {
    const firstSchool = schools[0]?.id || "";
    const firstPackage = packages[0];
    setFormData({
      ...emptyForm,
      school_id: firstSchool,
      package_id: firstPackage?.id || "",
      amount_paid: Number(firstPackage?.price || 0),
    });
    setIsModalOpen(true);
  };

  const handlePackageChange = (packageId: string) => {
    const selectedPackage = packages.find((item) => item.id === packageId);
    setFormData({ ...formData, package_id: packageId, amount_paid: Number(selectedPackage?.price || 0) });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("subscription_payments").insert({
      school_id: formData.school_id,
      package_id: formData.package_id,
      amount_paid: Number(formData.amount_paid),
      payment_status: formData.payment_status,
      payment_method: formData.payment_method,
      reference_number: formData.reference_number.trim() || null,
    });

    if (error) {
      alert(`تعذر تسجيل الدفعة: ${error.message}`);
      setSaving(false);
      return;
    }

    if (formData.payment_status === "PAID") {
      await activateSchoolSubscription(formData.school_id, formData.package_id);
    }

    await fetchData();
    setSaving(false);
    setIsModalOpen(false);
  };

  const updateStatus = async (payment: Payment, status: string) => {
    const { error } = await supabase.from("subscription_payments").update({ payment_status: status }).eq("id", payment.id);
    if (error) {
      alert(`تعذر تحديث الحالة: ${error.message}`);
      return;
    }

    if (status === "PAID") {
      await activateSchoolSubscription(payment.school_id, payment.package_id);
    }

    await fetchData();
  };

  const activateSchoolSubscription = async (schoolId: string, packageId: string) => {
    const selectedPackage = packages.find((item) => item.id === packageId);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + Number(selectedPackage?.duration_months || 1));

    await supabase
      .from("schools")
      .update({
        subscription_plan: selectedPackage?.name || "CUSTOM",
        subscription_end_date: endDate.toISOString(),
        is_active: true,
        is_portal_active: true,
      })
      .eq("id", schoolId);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل تريد حذف سجل الدفعة؟")) return;
    await supabase.from("subscription_payments").delete().eq("id", id);
    await fetchData();
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.5rem", color: "#38bdf8", fontWeight: 900 }}>Revenue Ops</p>
          <h1 style={{ margin: 0, color: "white", fontSize: "2.1rem", fontWeight: 900, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <CreditCard size={34} style={{ color: "#a78bfa" }} />
            الاشتراكات والمدفوعات
          </h1>
          <p style={{ margin: "0.65rem 0 0", color: "#94a3b8", maxWidth: 760 }}>
            تسجيل الدفعات، مراجعة الحالات، وتفعيل اشتراك المدرسة تلقائياً عند اعتماد الدفع.
          </p>
        </div>
        <button onClick={openModal} disabled={schools.length === 0 || packages.length === 0} style={primaryButton("#38bdf8")}>
          <Plus size={20} />
          تسجيل دفعة
        </button>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem" }}>
        <Metric icon={<Banknote size={22} />} label="إجمالي المحصل" value={`${formatMoney(stats.paidRevenue)} ريال`} color="#10b981" />
        <Metric icon={<CreditCard size={22} />} label="إيراد هذا الشهر" value={`${formatMoney(stats.monthRevenue)} ريال`} color="#38bdf8" />
        <Metric icon={<CheckCircle size={22} />} label="دفعات مكتملة" value={stats.paidCount.toString()} color="#a78bfa" />
        <Metric icon={<Clock size={22} />} label="قيد المراجعة" value={stats.pendingCount.toString()} color="#fbbf24" />
      </section>

      <section style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "1rem", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: "min(420px, 100%)" }}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث باسم المدرسة، المرجع، أو رقم العملية..." style={inputStyle({ paddingRight: "2.75rem" })} />
            <Search size={18} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["ALL", "PAID", "PENDING", "FAILED", "REFUNDED"].map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} style={filterButton(statusFilter === status)}>
                {statusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#94a3b8" }}>
            <Loader2 className="animate-spin" size={34} style={{ margin: "0 auto 1rem" }} />
            جاري تحميل المدفوعات...
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", minWidth: 1040 }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {["العملية", "المدرسة", "الباقة", "المبلغ", "الدفع", "الحالة", "إجراءات"].map((header) => (
                    <th key={header} style={thStyle}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>لا توجد عمليات مطابقة.</td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={tdStyle}>
                        <strong style={{ color: "white", display: "block", direction: "ltr", textAlign: "right" }}>{payment.id.split("-")[0].toUpperCase()}</strong>
                        <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{new Date(payment.created_at).toLocaleDateString("ar-SA")}</span>
                      </td>
                      <td style={tdStyle}>
                        <strong style={{ display: "block", color: "white" }}>{payment.schools?.name || "مدرسة غير موجودة"}</strong>
                        <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{payment.schools?.ministerial_number || "-"}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={badge("#38bdf8")}>{payment.subscription_packages?.name || "باقة محذوفة"}</span>
                        <span style={{ display: "block", color: "#94a3b8", marginTop: 8, fontSize: "0.85rem" }}>
                          {payment.subscription_packages?.duration_months || 1} شهر
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <strong style={{ color: "white", fontSize: "1.1rem" }}>{formatMoney(payment.amount_paid)} ريال</strong>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: "#cbd5e1" }}>{methodLabel(payment.payment_method)}</span>
                        {payment.reference_number && <span style={{ display: "block", color: "#94a3b8", marginTop: 6, fontSize: "0.85rem" }}>مرجع: {payment.reference_number}</span>}
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge status={payment.payment_status} />
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          {payment.payment_status !== "PAID" && (
                            <button onClick={() => updateStatus(payment, "PAID")} title="اعتماد الدفعة" style={iconButton("#10b981")}>
                              <CheckCircle size={16} />
                            </button>
                          )}
                          {payment.payment_status === "PENDING" && (
                            <button onClick={() => updateStatus(payment, "FAILED")} title="رفض الدفعة" style={iconButton("#ef4444")}>
                              <XCircle size={16} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(payment.id)} title="حذف" style={iconButton("#ef4444")}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ margin: 0, color: "white", fontSize: "1.5rem", fontWeight: 900 }}>تسجيل دفعة يدوية</h2>
                <p style={{ margin: "0.35rem 0 0", color: "#94a3b8" }}>اعتماد الدفعة المكتملة يمدد اشتراك المدرسة تلقائياً.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={iconButton("#94a3b8")}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "grid", gap: "1rem" }}>
              <Field label="المدرسة">
                <select required value={formData.school_id} onChange={(event) => setFormData({ ...formData, school_id: event.target.value })} style={inputStyle()}>
                  <option value="">اختر المدرسة...</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>{school.name} - {school.ministerial_number}</option>
                  ))}
                </select>
              </Field>
              <Field label="الباقة">
                <select required value={formData.package_id} onChange={(event) => handlePackageChange(event.target.value)} style={inputStyle()}>
                  <option value="">اختر الباقة...</option>
                  {packages.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} - {formatMoney(item.price)} ريال</option>
                  ))}
                </select>
              </Field>
              <div style={formGrid}>
                <Field label="المبلغ">
                  <input type="number" min={0} required value={formData.amount_paid} onChange={(event) => setFormData({ ...formData, amount_paid: Number(event.target.value) })} style={inputStyle()} />
                </Field>
                <Field label="طريقة الدفع">
                  <select value={formData.payment_method} onChange={(event) => setFormData({ ...formData, payment_method: event.target.value })} style={inputStyle()}>
                    <option value="BANK_TRANSFER">حوالة بنكية</option>
                    <option value="MADA">مدى</option>
                    <option value="CREDIT_CARD">بطاقة ائتمانية</option>
                    <option value="APPLE_PAY">Apple Pay</option>
                  </select>
                </Field>
                <Field label="الحالة">
                  <select value={formData.payment_status} onChange={(event) => setFormData({ ...formData, payment_status: event.target.value })} style={inputStyle()}>
                    <option value="PAID">مدفوعة</option>
                    <option value="PENDING">قيد المراجعة</option>
                    <option value="FAILED">فشلت</option>
                  </select>
                </Field>
                <Field label="رقم المرجع">
                  <input dir="ltr" value={formData.reference_number} onChange={(event) => setFormData({ ...formData, reference_number: event.target.value })} style={inputStyle()} />
                </Field>
              </div>
              <button type="submit" disabled={saving} style={primaryButton("#38bdf8")}>
                {saving ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
                تسجيل الدفعة
              </button>
            </form>
          </div>
        </div>
      )}
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
      <strong style={{ display: "block", marginTop: "0.65rem", color: "white", fontSize: "1.75rem", fontWeight: 900 }}>{value}</strong>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", color: "#cbd5e1", fontWeight: 900, marginBottom: "0.5rem" }}>{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "PAID" ? "#10b981" : status === "PENDING" ? "#fbbf24" : "#ef4444";
  const Icon = status === "PAID" ? CheckCircle : status === "PENDING" ? Clock : XCircle;
  return (
    <span style={{ ...badge(color), display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
      <Icon size={14} />
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ALL: "الكل",
    PAID: "مدفوعة",
    PENDING: "قيد المراجعة",
    FAILED: "فشلت",
    REFUNDED: "مسترجعة",
  };
  return labels[status] || status;
}

function methodLabel(method: string) {
  const labels: Record<string, string> = {
    BANK_TRANSFER: "حوالة بنكية",
    MADA: "مدى",
    CREDIT_CARD: "بطاقة ائتمانية",
    APPLE_PAY: "Apple Pay",
  };
  return labels[method] || method;
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("ar-SA");
}

const thStyle = { padding: "1rem 1.25rem", color: "#94a3b8", fontWeight: 900, whiteSpace: "nowrap" } as const;
const tdStyle = { padding: "1.1rem 1.25rem", verticalAlign: "top" } as const;
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem" } as const;
const modalBackdrop = { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(2,6,23,0.76)", display: "grid", placeItems: "center", padding: "1rem", backdropFilter: "blur(6px)" } as const;
const modalCard = { width: "min(720px, 100%)", maxHeight: "92vh", overflowY: "auto", background: "#1e293b", border: "1px solid #334155", borderRadius: "1.25rem", padding: "1.5rem", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" } as const;

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 46,
    padding: "0.85rem 1rem",
    borderRadius: "0.75rem",
    background: "#0f172a",
    border: "1px solid #334155",
    color: "white",
    outline: "none",
    fontFamily: "inherit",
    ...extra,
  };
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

function filterButton(active: boolean): React.CSSProperties {
  return {
    minHeight: 38,
    borderRadius: "999px",
    border: active ? "1px solid #38bdf8" : "1px solid #334155",
    background: active ? "rgba(56,189,248,0.14)" : "#0f172a",
    color: active ? "#38bdf8" : "#cbd5e1",
    padding: "0 0.9rem",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function iconButton(color: string): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: "0.7rem",
    border: `1px solid ${color}33`,
    background: `${color}1A`,
    color,
    display: "inline-grid",
    placeItems: "center",
    cursor: "pointer",
  };
}

function primaryButton(color: string): React.CSSProperties {
  return {
    minHeight: 46,
    padding: "0 1.15rem",
    borderRadius: "0.85rem",
    border: "none",
    background: color,
    color: "#0f172a",
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.6rem",
    cursor: "pointer",
  };
}
