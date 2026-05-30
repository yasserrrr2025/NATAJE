"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, LifeBuoy, Loader2, MessageSquareReply, RefreshCw, Search, Send, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SupportTicketRecord } from "@/lib/types";

type TicketRow = SupportTicketRecord & {
  schools?: {
    name: string | null;
    ministerial_number: string | null;
    contact_email: string | null;
  } | {
    name: string | null;
    ministerial_number: string | null;
    contact_email: string | null;
  }[] | null;
};

export default function SuperAdminSupportPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [reply, setReply] = useState("");
  const [nextStatus, setNextStatus] = useState("IN_PROGRESS");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*, schools(name, ministerial_number, contact_email)")
      .order("updated_at", { ascending: false });

    if (!error && data) setTickets(data as TicketRow[]);
    setLoading(false);
  };

  const filteredTickets = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const school = normalizeSchool(ticket.schools);
      const matchesStatus = statusFilter === "ALL" || ticket.status === statusFilter;
      const matchesSearch = !cleanQuery || [ticket.subject, ticket.message, school?.name, school?.ministerial_number, school?.contact_email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(cleanQuery));
      return matchesStatus && matchesSearch;
    });
  }, [tickets, query, statusFilter]);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((ticket) => ["OPEN", "IN_PROGRESS", "WAITING_SCHOOL"].includes(ticket.status)).length,
    resolved: tickets.filter((ticket) => ["RESOLVED", "CLOSED"].includes(ticket.status)).length,
    urgent: tickets.filter((ticket) => ticket.priority === "URGENT" || ticket.priority === "HIGH").length,
  }), [tickets]);

  const openTicket = (ticket: TicketRow) => {
    setSelectedTicket(ticket);
    setReply(ticket.admin_reply || "");
    setNextStatus(ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status);
  };

  const handleSave = async () => {
    if (!selectedTicket) return;
    setSaving(true);

    const payload = {
      admin_reply: reply.trim() || null,
      status: nextStatus,
      resolved_at: ["RESOLVED", "CLOSED"].includes(nextStatus) ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("support_tickets").update(payload).eq("id", selectedTicket.id);
    if (error) {
      alert(`تعذر تحديث التذكرة: ${error.message}`);
    } else {
      await loadTickets();
      setSelectedTicket(null);
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.5rem", color: "#38bdf8", fontWeight: 900 }}>Customer Success</p>
          <h1 style={{ margin: 0, color: "white", fontSize: "2.1rem", fontWeight: 900, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <LifeBuoy size={34} style={{ color: "#22d3ee" }} />
            مركز الدعم والتذاكر
          </h1>
          <p style={{ margin: "0.65rem 0 0", color: "#94a3b8", maxWidth: 760 }}>
            متابعة طلبات المدارس، تحديد الأولويات، كتابة رد الإدارة، وإغلاق الطلبات بعد المعالجة.
          </p>
        </div>
        <button onClick={loadTickets} style={secondaryButton}>
          <RefreshCw size={18} />
          تحديث
        </button>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem" }}>
        <Metric icon={<LifeBuoy size={22} />} label="إجمالي التذاكر" value={stats.total.toString()} color="#38bdf8" />
        <Metric icon={<Clock3 size={22} />} label="قيد المتابعة" value={stats.open.toString()} color="#fbbf24" />
        <Metric icon={<CheckCircle2 size={22} />} label="محلولة" value={stats.resolved.toString()} color="#10b981" />
        <Metric icon={<XCircle size={22} />} label="عالية الأولوية" value={stats.urgent.toString()} color="#ef4444" />
      </section>

      <section style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "1rem", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: "min(430px, 100%)" }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="بحث بالمدرسة، الموضوع، البريد، أو الرقم الوزاري..."
              style={inputStyle({ paddingRight: "2.75rem" })}
            />
            <Search size={18} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["ALL", "OPEN", "IN_PROGRESS", "WAITING_SCHOOL", "RESOLVED", "CLOSED"].map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} style={filterButton(statusFilter === status)}>
                {status === "ALL" ? "الكل" : statusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#94a3b8" }}>
            <Loader2 className="animate-spin" size={34} style={{ margin: "0 auto 1rem" }} />
            جاري تحميل التذاكر...
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1080, borderCollapse: "collapse", textAlign: "right" }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {["المدرسة", "الموضوع", "التصنيف", "الأولوية", "الحالة", "آخر تحديث", "إجراء"].map((header) => (
                    <th key={header} style={thStyle}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                      لا توجد تذاكر مطابقة.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    const school = normalizeSchool(ticket.schools);
                    return (
                      <tr key={ticket.id} style={{ borderBottom: "1px solid #334155" }}>
                        <td style={tdStyle}>
                          <strong style={{ display: "block", color: "white", marginBottom: 6 }}>{school?.name || "-"}</strong>
                          <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{school?.ministerial_number || "-"}</span>
                        </td>
                        <td style={tdStyle}>
                          <strong style={{ color: "#e2e8f0" }}>{ticket.subject}</strong>
                          <p style={{ margin: "0.4rem 0 0", color: "#94a3b8", maxWidth: 320, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ticket.message}</p>
                        </td>
                        <td style={tdStyle}>{categoryLabel(ticket.category)}</td>
                        <td style={tdStyle}><span style={badge(priorityColor(ticket.priority))}>{priorityLabel(ticket.priority)}</span></td>
                        <td style={tdStyle}><span style={badge(statusColor(ticket.status))}>{statusLabel(ticket.status)}</span></td>
                        <td style={tdStyle}>{formatDateTime(ticket.updated_at || ticket.created_at)}</td>
                        <td style={tdStyle}>
                          <button onClick={() => openTicket(ticket)} style={primaryButton("#22d3ee")}>
                            <MessageSquareReply size={16} />
                            متابعة
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedTicket && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <span style={badge(statusColor(selectedTicket.status))}>{statusLabel(selectedTicket.status)}</span>
                <h2 style={{ margin: "0.8rem 0 0.35rem", color: "white", fontSize: "1.45rem", fontWeight: 900 }}>{selectedTicket.subject}</h2>
                <p style={{ margin: 0, color: "#94a3b8" }}>{normalizeSchool(selectedTicket.schools)?.name || "-"} - {categoryLabel(selectedTicket.category)}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} style={iconButton("#94a3b8")}>×</button>
            </div>

            <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "0.95rem", padding: "1rem", marginBottom: "1rem" }}>
              <strong style={{ display: "block", color: "#e2e8f0", marginBottom: "0.5rem" }}>رسالة المدرسة</strong>
              <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.8 }}>{selectedTicket.message}</p>
            </div>

            <label style={{ display: "block", marginBottom: "1rem" }}>
              <span style={{ display: "block", color: "#cbd5e1", fontWeight: 900, marginBottom: "0.5rem" }}>حالة التذكرة</span>
              <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} style={inputStyle()}>
                <option value="OPEN">مفتوحة</option>
                <option value="IN_PROGRESS">قيد المعالجة</option>
                <option value="WAITING_SCHOOL">بانتظار المدرسة</option>
                <option value="RESOLVED">محلولة</option>
                <option value="CLOSED">مغلقة</option>
              </select>
            </label>

            <label style={{ display: "block" }}>
              <span style={{ display: "block", color: "#cbd5e1", fontWeight: 900, marginBottom: "0.5rem" }}>رد الإدارة المركزية</span>
              <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={7} style={{ ...inputStyle(), resize: "vertical", lineHeight: 1.8 }} />
            </label>

            <button onClick={handleSave} disabled={saving} style={{ ...primaryButton("#22d3ee"), width: "100%", marginTop: "1rem", minHeight: 48 }}>
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              حفظ الرد والحالة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeSchool(school: TicketRow["schools"]) {
  if (!school) return null;
  return Array.isArray(school) ? school[0] : school;
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
    OPEN: "#38bdf8",
    IN_PROGRESS: "#fbbf24",
    WAITING_SCHOOL: "#a78bfa",
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
    CERTIFICATES: "الشهادات",
  };
  return labels[category] || category;
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    LOW: "منخفضة",
    MEDIUM: "متوسطة",
    HIGH: "عالية",
    URGENT: "عاجلة",
  };
  return labels[priority] || priority;
}

function priorityColor(priority: string) {
  const colors: Record<string, string> = {
    LOW: "#64748b",
    MEDIUM: "#38bdf8",
    HIGH: "#fbbf24",
    URGENT: "#ef4444",
  };
  return colors[priority] || "#64748b";
}

function formatDateTime(dateString?: string | null) {
  return dateString ? new Date(dateString).toLocaleString("ar-SA") : "-";
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "1rem", padding: "1.2rem" }}>
      <span style={{ width: 42, height: 42, borderRadius: "0.85rem", background: `${color}1A`, color, display: "grid", placeItems: "center", marginBottom: "0.8rem" }}>{icon}</span>
      <p style={{ margin: 0, color: "#94a3b8", fontWeight: 800 }}>{label}</p>
      <strong style={{ display: "block", marginTop: "0.5rem", color, fontSize: "1.7rem", fontWeight: 900 }}>{value}</strong>
    </div>
  );
}

function badge(color: string): React.CSSProperties {
  return {
    background: `${color}1A`,
    color,
    border: `1px solid ${color}33`,
    borderRadius: "999px",
    padding: "0.32rem 0.75rem",
    fontWeight: 900,
    fontSize: "0.82rem",
    whiteSpace: "nowrap",
    display: "inline-flex",
    width: "fit-content",
  };
}

function filterButton(active: boolean): React.CSSProperties {
  return {
    minHeight: 38,
    borderRadius: "0.7rem",
    border: active ? "1px solid #38bdf8" : "1px solid #334155",
    background: active ? "rgba(56,189,248,0.14)" : "#0f172a",
    color: active ? "#e0f2fe" : "#94a3b8",
    padding: "0 0.85rem",
    fontWeight: 900,
    cursor: "pointer",
  };
}

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

function primaryButton(color: string): React.CSSProperties {
  return {
    minHeight: 40,
    padding: "0 0.9rem",
    borderRadius: "0.75rem",
    border: "none",
    background: color,
    color: color === "#22d3ee" ? "#0f172a" : "white",
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    cursor: "pointer",
  };
}

const secondaryButton: React.CSSProperties = {
  minHeight: 42,
  padding: "0 1rem",
  borderRadius: "0.75rem",
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#e2e8f0",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  fontWeight: 900,
  cursor: "pointer",
};

const iconButton = (color: string): React.CSSProperties => ({
  width: 36,
  height: 36,
  borderRadius: "0.75rem",
  border: `1px solid ${color}33`,
  background: `${color}1A`,
  color,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  fontSize: "1.5rem",
  lineHeight: 1,
});

const thStyle = { padding: "1rem 1.25rem", color: "#94a3b8", fontWeight: 900, whiteSpace: "nowrap" } as const;
const tdStyle = { padding: "1rem 1.25rem", verticalAlign: "middle", color: "#cbd5e1" } as const;
const modalBackdrop = { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(2,6,23,0.76)", display: "grid", placeItems: "center", padding: "1rem", backdropFilter: "blur(6px)" } as const;
const modalCard = { width: "min(760px, 100%)", maxHeight: "92vh", overflowY: "auto", background: "#1e293b", border: "1px solid #334155", borderRadius: "1.25rem", padding: "1.5rem", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" } as const;
