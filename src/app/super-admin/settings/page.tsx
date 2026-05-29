"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2, MessageCircle, Save, Settings, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type PlatformSettings = {
  id: string;
  platform_name: string;
  support_phone: string | null;
  support_email: string | null;
  whatsapp_template: string | null;
  invoice_terms: string | null;
};

const defaults: PlatformSettings = {
  id: "primary",
  platform_name: "NTAJE",
  support_phone: "",
  support_email: "",
  whatsapp_template:
    "مرحباً {school_name}، تم إنشاء حساب مدرستكم في منصة NTAJE.\nرابط الدخول: {login_url}\nالبريد: {email}\nكلمة المرور: {password}\nبوابة الطلاب: {portal_url}",
  invoice_terms: "يتم تفعيل الاشتراك بعد تأكيد الدفعة، وتظهر صلاحية المدرسة حسب الباقة المختارة.",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("platform_settings").select("*").eq("id", "primary").maybeSingle();
    if (data) {
      setSettings({
        ...defaults,
        ...(data as PlatformSettings),
      });
    }
    setLoading(false);
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);

    const { error } = await supabase.from("platform_settings").upsert({
      ...settings,
      support_phone: settings.support_phone?.trim() || null,
      support_email: settings.support_email?.trim() || null,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    if (error) {
      alert(`تعذر حفظ الإعدادات: ${error.message}`);
      return;
    }

    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const preview = fillTemplate(settings.whatsapp_template || defaults.whatsapp_template || "");

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.5rem", color: "#38bdf8", fontWeight: 900 }}>Platform Control</p>
          <h1 style={{ margin: 0, color: "white", fontSize: "2.1rem", fontWeight: 900, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Settings size={34} style={{ color: "#a78bfa" }} />
            إعدادات المنصة
          </h1>
          <p style={{ margin: "0.65rem 0 0", color: "#94a3b8", maxWidth: 760 }}>
            تحكم في هوية المنصة، بيانات الدعم، قالب واتساب، وشروط الفواتير التي تعتمد عليها العمليات اليومية.
          </p>
        </div>
        <StatusPill icon={<ShieldCheck size={16} />} label="إعدادات محفوظة في Supabase" color="#10b981" />
      </section>

      {loading ? (
        <div style={panelStyle}>
          <Loader2 className="animate-spin" size={34} style={{ margin: "0 auto 1rem", color: "#38bdf8" }} />
          <p style={{ margin: 0, color: "#94a3b8", textAlign: "center" }}>جاري تحميل الإعدادات...</p>
        </div>
      ) : (
        <form onSubmit={saveSettings} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(320px, 0.65fr)", gap: "1rem" }}>
          <section style={panelStyle}>
            <div style={formGrid}>
              <Field label="اسم المنصة">
                <input value={settings.platform_name} onChange={(event) => setSettings({ ...settings, platform_name: event.target.value })} style={inputStyle()} />
              </Field>
              <Field label="رقم الدعم / واتساب">
                <input dir="ltr" value={settings.support_phone || ""} onChange={(event) => setSettings({ ...settings, support_phone: event.target.value })} placeholder="9665xxxxxxxx" style={inputStyle()} />
              </Field>
              <Field label="بريد الدعم">
                <input type="email" dir="ltr" value={settings.support_email || ""} onChange={(event) => setSettings({ ...settings, support_email: event.target.value })} placeholder="support@example.com" style={inputStyle()} />
              </Field>
            </div>

            <Field label="قالب رسالة واتساب للمدارس">
              <textarea
                rows={8}
                value={settings.whatsapp_template || ""}
                onChange={(event) => setSettings({ ...settings, whatsapp_template: event.target.value })}
                style={{ ...inputStyle(), resize: "vertical", lineHeight: 1.8 }}
              />
            </Field>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "-0.35rem" }}>
              {["{school_name}", "{login_url}", "{portal_url}", "{email}", "{password}"].map((token) => (
                <span key={token} style={tokenStyle}>{token}</span>
              ))}
            </div>

            <Field label="شروط الفاتورة والاشتراك">
              <textarea
                rows={5}
                value={settings.invoice_terms || ""}
                onChange={(event) => setSettings({ ...settings, invoice_terms: event.target.value })}
                style={{ ...inputStyle(), resize: "vertical", lineHeight: 1.8 }}
              />
            </Field>

            <button type="submit" disabled={saving} style={primaryButton}>
              {saving ? <Loader2 className="animate-spin" size={20} /> : saved ? <CheckCircle size={20} /> : <Save size={20} />}
              {saving ? "جاري الحفظ..." : saved ? "تم الحفظ" : "حفظ الإعدادات"}
            </button>
          </section>

          <aside style={panelStyle}>
            <h2 style={{ margin: "0 0 1rem", color: "white", fontSize: "1.15rem", fontWeight: 900, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <MessageCircle size={20} style={{ color: "#10b981" }} />
              معاينة واتساب
            </h2>
            <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "1rem", padding: "1rem", color: "#e2e8f0", whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
              {preview}
            </div>
            <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
              <InfoRow label="الاسم" value={settings.platform_name || "NTAJE"} />
              <InfoRow label="الدعم" value={settings.support_phone || "غير محدد"} />
              <InfoRow label="البريد" value={settings.support_email || "غير محدد"} />
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: "1rem" }}>
      <span style={{ display: "block", marginBottom: "0.5rem", color: "#cbd5e1", fontWeight: 900 }}>{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: `${color}1A`, color, border: `1px solid ${color}33`, padding: "0.75rem 1rem", borderRadius: "999px", fontWeight: 900 }}>
      {icon}
      {label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", borderBottom: "1px solid #334155", paddingBottom: "0.75rem" }}>
      <span style={{ color: "#94a3b8", fontWeight: 800 }}>{label}</span>
      <strong style={{ color: "white", direction: "ltr", textAlign: "left" }}>{value}</strong>
    </div>
  );
}

function fillTemplate(template: string) {
  return template
    .replaceAll("{school_name}", "مدارس المستقبل الأهلية")
    .replaceAll("{login_url}", "https://ntaje.app/login")
    .replaceAll("{portal_url}", "https://ntaje.app/portal/future-school")
    .replaceAll("{email}", "admin@school.sa")
    .replaceAll("{password}", "NTAJE2026");
}

const panelStyle = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "1rem",
  padding: "1.25rem",
} as const;

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "1rem",
} as const;

const tokenStyle = {
  color: "#38bdf8",
  background: "rgba(56,189,248,0.1)",
  border: "1px solid rgba(56,189,248,0.2)",
  borderRadius: "999px",
  padding: "0.35rem 0.7rem",
  fontSize: "0.82rem",
  fontWeight: 900,
  direction: "ltr",
} as const;

const primaryButton = {
  width: "100%",
  minHeight: 48,
  border: "none",
  borderRadius: "0.85rem",
  background: "#38bdf8",
  color: "#0f172a",
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.6rem",
  cursor: "pointer",
} as const;

function inputStyle(): React.CSSProperties {
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
  };
}
