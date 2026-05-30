"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle,
  Copy,
  Edit2,
  Loader2,
  MessageCircle,
  Plus,
  Power,
  PowerOff,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type SchoolRow = {
  id: string;
  name: string;
  slug: string;
  ministerial_number: string;
  contact_email: string | null;
  password: string | null;
  whatsapp_phone: string | null;
  subscription_plan: string | null;
  subscription_end_date: string | null;
  is_active: boolean | null;
  is_portal_active: boolean | null;
  created_at: string;
  notes: string | null;
};

type SettingsRow = {
  whatsapp_template: string | null;
};

const emptyForm = {
  id: "",
  name: "",
  slug: "",
  ministerial_number: "",
  contact_email: "",
  password: "",
  whatsapp_phone: "",
  subscription_plan: "TRIAL",
  subscription_end_date: "",
  is_active: true,
  is_portal_active: true,
  notes: "",
};

export default function ManageSchoolsPage() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [sessionPasswords, setSessionPasswords] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [schoolsRes, settingsRes] = await Promise.all([
      supabase.from("schools").select("*").order("created_at", { ascending: false }),
      supabase.from("platform_settings").select("whatsapp_template").eq("id", "primary").maybeSingle(),
    ]);

    if (schoolsRes.data) setSchools(schoolsRes.data as SchoolRow[]);
    if (settingsRes.data) setSettings(settingsRes.data as SettingsRow);
    setLoading(false);
  };

  const filteredSchools = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return schools;
    return schools.filter((school) =>
      [school.name, school.ministerial_number, school.contact_email, school.slug]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [schools, searchQuery]);

  const stats = useMemo(() => {
    const active = schools.filter((school) => school.is_active !== false).length;
    const expired = schools.filter((school) => isExpired(school.subscription_end_date)).length;
    return {
      total: schools.length,
      active,
      expired,
      trial: schools.filter((school) => (school.subscription_plan || "TRIAL") === "TRIAL").length,
    };
  }, [schools]);

  const openCreateModal = () => {
    setFormData({
      ...emptyForm,
      password: generatePassword(),
      slug: "",
    });
    setModalMode("create");
  };

  const openEditModal = (school: SchoolRow) => {
    setFormData({
      id: school.id,
      name: school.name || "",
      slug: school.slug || "",
      ministerial_number: school.ministerial_number || "",
      contact_email: school.contact_email || "",
      password: "",
      whatsapp_phone: school.whatsapp_phone || "",
      subscription_plan: school.subscription_plan || "TRIAL",
      subscription_end_date: school.subscription_end_date ? school.subscription_end_date.split("T")[0] : "",
      is_active: school.is_active !== false,
      is_portal_active: school.is_portal_active !== false,
      notes: school.notes || "",
    });
    setModalMode("edit");
  };

  const handleSaveSchool = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: formData.name.trim(),
      slug: normalizeSlug(formData.slug || formData.ministerial_number),
      ministerial_number: formData.ministerial_number.trim(),
      contact_email: formData.contact_email.trim() || null,
      whatsapp_phone: normalizePhone(formData.whatsapp_phone),
      subscription_plan: formData.subscription_plan,
      subscription_end_date: formData.subscription_end_date
        ? new Date(formData.subscription_end_date).toISOString()
        : null,
      is_active: formData.is_active,
      is_portal_active: formData.is_portal_active,
      notes: formData.notes.trim() || null,
      logo_url: "https://upload.wikimedia.org/wikipedia/ar/1/17/Saudi_Ministry_of_Education_Logo_2025.png",
    };

    if (modalMode === "create" && formData.password.trim().length < 6) {
      alert("كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل.");
      setSaving(false);
      return;
    }

    let savedSchoolId = formData.id;
    const saveResult = modalMode === "create"
      ? await supabase.from("schools").insert(payload).select("id").single()
      : await supabase.from("schools").update(payload).eq("id", formData.id).select("id").single();

    const { error } = saveResult;
    if (saveResult.data?.id) savedSchoolId = saveResult.data.id;

    if (error) {
      alert(`تعذر الحفظ: ${error.message}`);
    } else {
      if (formData.password.trim()) {
        const { error: passwordError } = await supabase.rpc("set_school_password", {
          input_school_id: savedSchoolId,
          input_password: formData.password.trim(),
        });

        if (passwordError) {
          alert(`تم حفظ المدرسة، لكن تعذر تحديث كلمة المرور: ${passwordError.message}`);
        } else {
          setSessionPasswords((current) => ({ ...current, [savedSchoolId]: formData.password.trim() }));
        }
      }
      setModalMode(null);
      await fetchData();
    }

    setSaving(false);
  };

  const handleToggleActive = async (school: SchoolRow) => {
    const nextStatus = school.is_active === false;
    const { error } = await supabase
      .from("schools")
      .update({ is_active: nextStatus, is_portal_active: nextStatus })
      .eq("id", school.id);
    if (!error) {
      setSchools((current) =>
        current.map((item) =>
          item.id === school.id ? { ...item, is_active: nextStatus, is_portal_active: nextStatus } : item,
        ),
      );
    }
  };

  const copyPortal = async (school: SchoolRow) => {
    await navigator.clipboard.writeText(`${window.location.origin}/portal/${school.slug}`);
  };

  const openWhatsApp = (school: SchoolRow) => {
    const phone = normalizePhone(school.whatsapp_phone || "");
    if (!phone) {
      alert("أضف رقم واتساب للمدرسة أولاً.");
      return;
    }

    const passwordForMessage = sessionPasswords[school.id] || school.password || "";
    if (!passwordForMessage) {
      alert("لأسباب الأمان لا يمكن عرض كلمة المرور المخزنة. عيّن كلمة مرور جديدة للمدرسة ثم أرسل رسالة واتساب.");
      return;
    }

    const template = settings?.whatsapp_template || emptyWhatsappTemplate;
    const message = fillTemplate(template, school, passwordForMessage);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.5rem", color: "#38bdf8", fontWeight: 800 }}>Operations Console</p>
          <h1 style={{ fontSize: "2.1rem", fontWeight: 900, margin: 0, color: "white", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Building2 size={34} style={{ color: "#a78bfa" }} />
            إدارة المدارس والعملاء
          </h1>
          <p style={{ color: "#94a3b8", margin: "0.65rem 0 0", maxWidth: 720 }}>
            إضافة المدارس يدويًا، ضبط الاشتراك، تعطيل الخدمة، وفتح رسالة واتساب جاهزة لإرسال بيانات الدخول.
          </p>
        </div>

        <button onClick={openCreateModal} style={primaryButton("#a78bfa")}>
          <Plus size={20} />
          إضافة مدرسة
        </button>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
        <Metric label="إجمالي المدارس" value={stats.total} color="#38bdf8" />
        <Metric label="مدارس مفعلة" value={stats.active} color="#10b981" />
        <Metric label="تجريبية" value={stats.trial} color="#fbbf24" />
        <Metric label="منتهية" value={stats.expired} color="#ef4444" />
      </section>

      <section style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "1rem", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: "min(420px, 100%)" }}>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="بحث باسم المدرسة، الرقم الوزاري، البريد، أو الرابط..."
              style={inputStyle({ paddingRight: "2.75rem" })}
            />
            <Search size={18} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          </div>
          <button onClick={fetchData} style={secondaryButton}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : "تحديث"}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#94a3b8" }}>
            <Loader2 className="animate-spin" size={34} style={{ margin: "0 auto 1rem" }} />
            جاري تحميل المدارس...
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", minWidth: 980 }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {["المدرسة", "التواصل", "الاشتراك", "البوابة", "الحالة", "إجراءات"].map((header) => (
                    <th key={header} style={thStyle}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                      لا توجد مدارس مطابقة.
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((school) => {
                    const expired = isExpired(school.subscription_end_date);
                    const active = school.is_active !== false;
                    return (
                      <tr key={school.id} style={{ borderBottom: "1px solid #334155", background: !active || expired ? "rgba(239, 68, 68, 0.05)" : "transparent" }}>
                        <td style={tdStyle}>
                          <strong style={{ display: "block", color: "white", marginBottom: 6 }}>{school.name}</strong>
                          <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>رقم وزاري: {school.ministerial_number}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ display: "block", color: "#cbd5e1" }}>{school.contact_email || "لا يوجد بريد"}</span>
                          <span style={{ color: "#94a3b8", fontSize: "0.85rem", direction: "ltr", display: "block", textAlign: "right" }}>
                            {school.whatsapp_phone || "لا يوجد واتساب"}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={badge("#38bdf8")}>{school.subscription_plan || "TRIAL"}</span>
                          <span style={{ display: "block", marginTop: 8, color: expired ? "#ef4444" : "#10b981", fontSize: "0.85rem" }}>
                            {school.subscription_end_date ? new Date(school.subscription_end_date).toLocaleDateString("ar-SA") : "مدى الحياة"}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ color: "#cbd5e1", direction: "ltr", display: "block", textAlign: "right" }}>/portal/{school.slug}</span>
                          <button onClick={() => copyPortal(school)} style={linkButton}>
                            <Copy size={14} />
                            نسخ الرابط
                          </button>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ ...badge(active ? "#10b981" : "#ef4444"), display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                            {active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                            {active ? "مفعلة" : "معطلة"}
                          </span>
                          <span style={{ display: "block", color: school.is_portal_active === false ? "#ef4444" : "#94a3b8", marginTop: 8, fontSize: "0.85rem" }}>
                            البوابة: {school.is_portal_active === false ? "مغلقة" : "مفتوحة"}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button onClick={() => openEditModal(school)} title="تعديل" style={iconButton("#38bdf8")}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => openWhatsApp(school)} title="إرسال واتساب" style={iconButton("#10b981")}>
                              <MessageCircle size={16} />
                            </button>
                            <button onClick={() => handleToggleActive(school)} title={active ? "تعطيل" : "تفعيل"} style={iconButton(active ? "#ef4444" : "#10b981")}>
                              {active ? <PowerOff size={16} /> : <Power size={16} />}
                            </button>
                          </div>
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

      {modalMode && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ margin: 0, color: "white", fontSize: "1.5rem", fontWeight: 900 }}>
                  {modalMode === "create" ? "إضافة مدرسة جديدة" : "تعديل بيانات المدرسة"}
                </h2>
                <p style={{ margin: "0.35rem 0 0", color: "#94a3b8" }}>بيانات الدخول والاشتراك والتواصل</p>
              </div>
              <button onClick={() => setModalMode(null)} style={iconButton("#94a3b8")}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSchool} style={{ display: "grid", gap: "1rem" }}>
              <div style={formGrid}>
                <Field label="اسم المدرسة">
                  <input required value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} style={inputStyle()} />
                </Field>
                <Field label="الرقم الوزاري">
                  <input required value={formData.ministerial_number} onChange={(event) => setFormData({ ...formData, ministerial_number: event.target.value })} style={inputStyle()} />
                </Field>
                <Field label="رابط البوابة">
                  <input required dir="ltr" value={formData.slug} onChange={(event) => setFormData({ ...formData, slug: normalizeSlug(event.target.value) })} placeholder="school-slug" style={inputStyle()} />
                </Field>
                <Field label="واتساب المدرسة">
                  <input dir="ltr" value={formData.whatsapp_phone} onChange={(event) => setFormData({ ...formData, whatsapp_phone: event.target.value })} placeholder="9665xxxxxxxx" style={inputStyle()} />
                </Field>
                <Field label="بريد الدخول">
                  <input type="email" dir="ltr" value={formData.contact_email} onChange={(event) => setFormData({ ...formData, contact_email: event.target.value })} style={inputStyle()} />
                </Field>
                <Field label="كلمة المرور">
                  <input required={modalMode === "create"} minLength={modalMode === "create" ? 6 : undefined} dir="ltr" value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} placeholder={modalMode === "create" ? "NTAJE2026" : "اتركه فارغاً دون تغيير"} style={inputStyle()} />
                </Field>
                <Field label="الباقة">
                  <select value={formData.subscription_plan} onChange={(event) => setFormData({ ...formData, subscription_plan: event.target.value })} style={inputStyle()}>
                    <option value="TRIAL">TRIAL</option>
                    <option value="BASIC">BASIC</option>
                    <option value="PRO">PRO</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </Field>
                <Field label="تاريخ الانتهاء">
                  <input type="date" value={formData.subscription_end_date} onChange={(event) => setFormData({ ...formData, subscription_end_date: event.target.value })} style={inputStyle()} />
                </Field>
              </div>

              <Field label="ملاحظات داخلية">
                <textarea value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} rows={3} style={{ ...inputStyle(), resize: "vertical" }} />
              </Field>

              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <label style={checkStyle}>
                  <input type="checkbox" checked={formData.is_active} onChange={(event) => setFormData({ ...formData, is_active: event.target.checked })} />
                  تفعيل حساب المدرسة
                </label>
                <label style={checkStyle}>
                  <input type="checkbox" checked={formData.is_portal_active} onChange={(event) => setFormData({ ...formData, is_portal_active: event.target.checked })} />
                  فتح بوابة الطلاب
                </label>
              </div>

              <button type="submit" disabled={saving} style={primaryButton("#38bdf8")}>
                {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                حفظ المدرسة
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "1rem", padding: "1.25rem" }}>
      <p style={{ margin: 0, color: "#94a3b8", fontWeight: 700 }}>{label}</p>
      <strong style={{ display: "block", marginTop: "0.75rem", color, fontSize: "2rem", fontWeight: 900 }}>{value}</strong>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", marginBottom: "0.5rem", color: "#cbd5e1", fontWeight: 800 }}>{label}</span>
      {children}
    </label>
  );
}

function isExpired(dateString: string | null) {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
}

function generatePassword() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function normalizeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function normalizePhone(value: string) {
  return value.replace(/[^\d]/g, "");
}

function fillTemplate(template: string, school: SchoolRow, plainPassword = "") {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return template
    .replaceAll("{school_name}", school.name || "")
    .replaceAll("{login_url}", `${origin}/login`)
    .replaceAll("{portal_url}", `${origin}/portal/${school.slug}`)
    .replaceAll("{email}", school.contact_email || "")
    .replaceAll("{password}", plainPassword);
}

const emptyWhatsappTemplate = "مرحباً {school_name}، تم إنشاء حساب مدرستكم في منصة NTAJE.\nرابط الدخول: {login_url}\nالبريد: {email}\nكلمة المرور: {password}\nبوابة الطلاب: {portal_url}";

const thStyle = { padding: "1rem 1.25rem", color: "#94a3b8", fontWeight: 800, whiteSpace: "nowrap" } as const;
const tdStyle = { padding: "1.1rem 1.25rem", verticalAlign: "top" } as const;
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" } as const;
const modalBackdrop = { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(2,6,23,0.76)", display: "grid", placeItems: "center", padding: "1rem", backdropFilter: "blur(6px)" } as const;
const modalCard = { width: "min(760px, 100%)", maxHeight: "92vh", overflowY: "auto", background: "#1e293b", border: "1px solid #334155", borderRadius: "1.25rem", padding: "1.5rem", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" } as const;
const secondaryButton = { minHeight: 42, padding: "0 1rem", borderRadius: "0.75rem", border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0", fontWeight: 800, cursor: "pointer" } as const;
const linkButton = { marginTop: 8, color: "#38bdf8", background: "transparent", border: "none", padding: 0, display: "inline-flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontWeight: 800 } as const;
const checkStyle = { display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#e2e8f0", background: "#0f172a", border: "1px solid #334155", borderRadius: "0.75rem", padding: "0.85rem 1rem", fontWeight: 800 } as const;

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
    color: color === "#fbbf24" || color === "#a78bfa" || color === "#38bdf8" ? "#0f172a" : "white",
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.6rem",
    cursor: "pointer",
  };
}
