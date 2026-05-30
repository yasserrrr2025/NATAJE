"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, LifeBuoy, Loader2, MessageSquarePlus, RefreshCw, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentSchoolId } from "@/lib/school-session";
import type { SupportTicketRecord } from "@/lib/types";

const emptyForm = {
  subject: "",
  category: "GENERAL",
  priority: "MEDIUM",
  message: "",
};

export default function SchoolSupportPage() {
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    const schoolId = getCurrentSchoolId();
    if (!schoolId) {
      setTickets([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("school_id", schoolId)
      .order("updated_at", { ascending: false });

    if (!error && data) setTickets(data as SupportTicketRecord[]);
    setLoading(false);
  };

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((ticket) => ["OPEN", "IN_PROGRESS", "WAITING_SCHOOL"].includes(ticket.status)).length,
    resolved: tickets.filter((ticket) => ["RESOLVED", "CLOSED"].includes(ticket.status)).length,
  }), [tickets]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const schoolId = getCurrentSchoolId();
    if (!schoolId) return;

    setSaving(true);
    setStatusMessage("");
    const { error } = await supabase.from("support_tickets").insert({
      school_id: schoolId,
      subject: formData.subject.trim(),
      category: formData.category,
      priority: formData.priority,
      message: formData.message.trim(),
      status: "OPEN",
    });

    if (error) {
      setStatusMessage(`تعذر فتح التذكرة: ${error.message}`);
    } else {
      setFormData(emptyForm);
      setStatusMessage("تم فتح التذكرة بنجاح. ستظهر متابعة الإدارة هنا.");
      await loadTickets();
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.5rem", color: "var(--primary)", fontWeight: 900 }}>Support Desk</p>
          <h1 className="heading-2" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <LifeBuoy size={32} style={{ color: "var(--primary)" }} />
            تذاكر الدعم
          </h1>
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>
            افتح طلب دعم من داخل لوحة المدرسة وتابع رد الإدارة المركزية وحالة المعالجة.
          </p>
        </div>
        <button onClick={loadTickets} style={secondaryButton}>
          <RefreshCw size={18} />
          تحديث
        </button>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem" }}>
        <Metric icon={<LifeBuoy size={22} />} label="إجمالي التذاكر" value={stats.total.toString()} color="#2563eb" />
        <Metric icon={<Clock3 size={22} />} label="قيد المتابعة" value={stats.open.toString()} color="#f59e0b" />
        <Metric icon={<CheckCircle2 size={22} />} label="مغلقة أو محلولة" value={stats.resolved.toString()} color="#10b981" />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(280px, 0.9fr) minmax(320px, 1.1fr)", gap: "1rem" }} className="support-grid">
        <form onSubmit={handleSubmit} style={{ ...panelStyle, display: "grid", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <MessageSquarePlus size={24} style={{ color: "var(--primary)" }} />
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900 }}>فتح تذكرة جديدة</h2>
          </div>

          <Field label="عنوان الطلب">
            <input
              required
              value={formData.subject}
              onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
              className="input"
              placeholder="مثال: مشكلة في مطابقة شهادة طالب"
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <Field label="التصنيف">
              <select value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })} className="input">
                <option value="GENERAL">عام</option>
                <option value="TECHNICAL">تقني</option>
                <option value="BILLING">اشتراك وفواتير</option>
                <option value="DATA">بيانات الطلاب</option>
                <option value="CERTIFICATES">الشهادات</option>
              </select>
            </Field>
            <Field label="الأولوية">
              <select value={formData.priority} onChange={(event) => setFormData({ ...formData, priority: event.target.value })} className="input">
                <option value="LOW">منخفضة</option>
                <option value="MEDIUM">متوسطة</option>
                <option value="HIGH">عالية</option>
                <option value="URGENT">عاجلة</option>
              </select>
            </Field>
          </div>

          <Field label="وصف الطلب">
            <textarea
              required
              value={formData.message}
              onChange={(event) => setFormData({ ...formData, message: event.target.value })}
              className="input"
              rows={7}
              placeholder="اكتب التفاصيل والخطوات التي حدثت قبل المشكلة..."
              style={{ resize: "vertical", lineHeight: 1.8 }}
            />
          </Field>

          {statusMessage && (
            <div style={{ padding: "0.9rem 1rem", borderRadius: "0.85rem", background: statusMessage.startsWith("تعذر") ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: statusMessage.startsWith("تعذر") ? "#ef4444" : "#10b981", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {statusMessage.startsWith("تعذر") ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              {statusMessage}
            </div>
          )}

          <button type="submit" disabled={saving} style={primaryButton}>
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            إرسال التذكرة
          </button>
        </form>

        <section style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--secondary)" }}>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900 }}>متابعة الطلبات</h2>
          </div>
          {loading ? (
            <div style={{ padding: "4rem", textAlign: "center" }}>
              <Loader2 className="animate-spin" size={34} style={{ color: "var(--primary)", marginBottom: "1rem" }} />
              <p className="text-muted" style={{ fontWeight: 800 }}>جاري تحميل التذاكر...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: "4rem 1rem", textAlign: "center" }}>
              <LifeBuoy size={48} style={{ color: "var(--secondary-foreground)", opacity: 0.5, marginBottom: "1rem" }} />
              <h3 style={{ margin: 0, fontWeight: 900 }}>لا توجد تذاكر بعد</h3>
              <p className="text-muted" style={{ marginTop: "0.5rem" }}>افتح أول طلب دعم عند الحاجة.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.8rem", padding: "1rem" }}>
              {tickets.map((ticket) => (
                <article key={ticket.id} style={{ background: "var(--background)", border: "1px solid var(--secondary)", borderRadius: "0.95rem", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 900 }}>{ticket.subject}</h3>
                      <p className="text-muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
                        {categoryLabel(ticket.category)} - {priorityLabel(ticket.priority)} - {formatDate(ticket.created_at)}
                      </p>
                    </div>
                    <span style={badge(statusColor(ticket.status))}>{statusLabel(ticket.status)}</span>
                  </div>
                  <p style={{ margin: "1rem 0 0", lineHeight: 1.8 }}>{ticket.message}</p>
                  {ticket.admin_reply && (
                    <div style={{ marginTop: "1rem", background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.18)", borderRadius: "0.85rem", padding: "0.9rem" }}>
                      <strong style={{ display: "block", marginBottom: "0.4rem", color: "var(--primary)" }}>رد الإدارة المركزية</strong>
                      <p style={{ margin: 0, lineHeight: 1.8 }}>{ticket.admin_reply}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <style>{`
        @media (max-width: 960px) {
          .support-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", marginBottom: "0.5rem", fontWeight: 900 }}>{label}</span>
      {children}
    </label>
  );
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ ...panelStyle, padding: "1rem" }}>
      <span style={{ width: 40, height: 40, borderRadius: "0.85rem", background: `${color}1A`, color, display: "grid", placeItems: "center", marginBottom: "0.75rem" }}>{icon}</span>
      <p className="text-muted" style={{ margin: 0, fontWeight: 800 }}>{label}</p>
      <strong style={{ display: "block", marginTop: "0.4rem", fontSize: "1.6rem", fontWeight: 900 }}>{value}</strong>
    </div>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    OPEN: "مفتوحة",
    IN_PROGRESS: "قيد المعالجة",
    WAITING_SCHOOL: "بانتظار المدرسة",
    RESOLVED: "محلولة",
    CLOSED: "مغلقة",
  };
  return labels[status] || status;
}

function statusColor(status: string) {
  const colors: Record<string, string> = {
    OPEN: "#2563eb",
    IN_PROGRESS: "#f59e0b",
    WAITING_SCHOOL: "#8b5cf6",
    RESOLVED: "#10b981",
    CLOSED: "#64748b",
  };
  return colors[status] || "#64748b";
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    GENERAL: "عام",
    TECHNICAL: "تقني",
    BILLING: "اشتراك وفواتير",
    DATA: "بيانات",
    CERTIFICATES: "شهادات",
  };
  return labels[category] || category;
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    LOW: "أولوية منخفضة",
    MEDIUM: "أولوية متوسطة",
    HIGH: "أولوية عالية",
    URGENT: "عاجلة",
  };
  return labels[priority] || priority;
}

function formatDate(dateString?: string | null) {
  return dateString ? new Date(dateString).toLocaleDateString("ar-SA") : "-";
}

function badge(color: string): React.CSSProperties {
  return {
    color,
    background: `${color}1A`,
    border: `1px solid ${color}33`,
    borderRadius: "999px",
    padding: "0.32rem 0.7rem",
    fontWeight: 900,
    fontSize: "0.8rem",
    whiteSpace: "nowrap",
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
  minHeight: 46,
  borderRadius: "0.85rem",
  border: "none",
  background: "var(--primary)",
  color: "white",
  padding: "0 1rem",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: "var(--secondary)",
  color: "var(--foreground)",
};
