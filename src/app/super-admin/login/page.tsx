"use client";

import { AlertCircle, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const CENTRAL_ADMIN_SESSION_KEY = "central_admin_session";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: rpcError } = await supabase.rpc("verify_platform_admin_pin", {
        input_pin: pin,
      });

      if (rpcError) {
        throw rpcError;
      }

      if (data !== true) {
        setError("الرقم السري غير صحيح.");
        setLoading(false);
        return;
      }

      window.localStorage.setItem(
        CENTRAL_ADMIN_SESSION_KEY,
        JSON.stringify({ signedInAt: new Date().toISOString() }),
      );
      router.replace("/super-admin");
    } catch (err) {
      console.error(err);
      setError("تعذر التحقق من الرقم السري. تأكد من تجهيز جدول الإدارة المركزية في Supabase.");
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0f172a", padding: "2rem", color: "white" }}>
      <section style={{ width: "100%", maxWidth: 440, background: "#1e293b", border: "1px solid #334155", borderRadius: "1.25rem", padding: "2.5rem", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ width: 56, height: 56, borderRadius: "1rem", display: "grid", placeItems: "center", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8" }}>
            <ShieldCheck size={30} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900 }}>دخول الإدارة المركزية</h1>
            <p style={{ margin: "0.35rem 0 0", color: "#94a3b8", fontWeight: 600 }}>مسار مستقل ومحمي للمنصة</p>
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", background: "rgba(239,68,68,0.12)", color: "#fecaca", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "0.9rem", padding: "1rem", marginBottom: "1.5rem", fontWeight: 700 }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", marginBottom: "0.65rem", color: "#cbd5e1", fontWeight: 800 }}>الرقم السري</span>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                minLength={6}
                required
                style={{ width: "100%", padding: "1rem 3rem 1rem 1rem", borderRadius: "0.9rem", border: "1px solid #334155", background: "#0f172a", color: "white", fontSize: "1.25rem", fontWeight: 800, textAlign: "center", letterSpacing: "0.35rem", outline: "none" }}
              />
              <LockKeyhole size={20} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading || pin.length < 6}
            style={{ minHeight: 54, borderRadius: "0.9rem", border: "none", background: "linear-gradient(135deg, #2563eb, #38bdf8)", color: "white", fontSize: "1.1rem", fontWeight: 900, cursor: loading ? "wait" : "pointer", opacity: loading || pin.length < 6 ? 0.65 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}
          >
            {loading ? <Loader2 className="animate-spin" size={22} /> : <ShieldCheck size={22} />}
            دخول آمن
          </button>
        </form>
      </section>
    </main>
  );
}
