"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentSchoolId } from "@/lib/school-session";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck2,
  Loader2,
  Printer,
  RefreshCw,
  Users,
} from "lucide-react";

const SITE_LOGO =
  "https://upload.wikimedia.org/wikipedia/ar/1/17/Saudi_Ministry_of_Education_Logo_2025.png";

type CertificateAnalytics = {
  id: string;
  viewed_at: string | null;
  students:
    | {
        name: string | null;
        national_id: string | null;
        grade_level: string | null;
        classroom: string | null;
      }
    | {
        name: string | null;
        national_id: string | null;
        grade_level: string | null;
        classroom: string | null;
      }[]
    | null;
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("(اسم المدرسة)");
  const [stats, setStats] = useState({
    totalStudents: 0,
    matchedCertificates: 0,
    manualReview: 0,
    viewedCertificates: 0,
  });
  const [unviewedList, setUnviewedList] = useState<CertificateAnalytics[]>([]);

  const currentDate = new Date().toLocaleDateString("ar-SA");
  const viewPercentage = stats.matchedCertificates > 0
    ? Math.round((stats.viewedCertificates / stats.matchedCertificates) * 100)
    : 0;
  const unviewedPercentage = stats.matchedCertificates > 0
    ? Math.round((unviewedList.length / stats.matchedCertificates) * 100)
    : 0;

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const schoolId = getCurrentSchoolId();
      if (!schoolId) {
        setLoading(false);
        return;
      }

      const { data: schoolData } = await supabase
        .from("schools")
        .select("name")
        .eq("id", schoolId)
        .maybeSingle();

      if (schoolData?.name) setSchoolName(schoolData.name);

      const [studentsRes, matchedRes, reviewRes, certificatesRes] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase
          .from("certificates")
          .select("*", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("status", "MATCHED"),
        supabase
          .from("certificates")
          .select("*", { count: "exact", head: true })
          .eq("school_id", schoolId)
          .eq("status", "MANUAL_REVIEW_NEEDED"),
        supabase
          .from("certificates")
          .select("id, viewed_at, student_id, students(name, national_id, grade_level, classroom)")
          .eq("school_id", schoolId)
          .eq("status", "MATCHED")
          .order("created_at", { ascending: false }),
      ]);

      if (certificatesRes.error) throw certificatesRes.error;

      const certificates = (certificatesRes.data || []) as CertificateAnalytics[];
      const viewed = certificates.filter((cert) => cert.viewed_at).length;
      const unviewed = certificates.filter((cert) => !cert.viewed_at && normalizeStudent(cert.students));

      setStats({
        totalStudents: studentsRes.count || 0,
        matchedCertificates: matchedRes.count || 0,
        manualReview: reviewRes.count || 0,
        viewedCertificates: viewed,
      });
      setUnviewedList(unviewed);
    } catch (err) {
      console.error("Error loading dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const topInsight = useMemo(() => {
    if (stats.matchedCertificates === 0) return "ابدأ برفع الشهادات حتى تظهر مؤشرات القراءة والاستلام.";
    if (unviewedList.length === 0) return "ممتاز، جميع الشهادات الجاهزة تم فتحها من الطلاب أو أولياء الأمور.";
    return `يوجد ${unviewedList.length} شهادات جاهزة لم يتم فتحها بعد. اطبع الكشف وتابعها مع المرشد الطلابي.`;
  }, [stats.matchedCertificates, unviewedList.length]);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: "50vh" }}>
        <Loader2 className="animate-spin" size={48} style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="admin-dashboard animate-fade-in">
      <section className="screen-only" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div>
          <p style={{ margin: "0 0 0.5rem", color: "var(--primary)", fontWeight: 900 }}>School Command Center</p>
          <h1 className="heading-2" style={{ margin: 0 }}>نظرة عامة والتحليلات</h1>
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>{topInsight}</p>
        </div>
        <button onClick={loadStats} style={secondaryButton}>
          <RefreshCw size={18} />
          تحديث البيانات
        </button>
      </section>

      <section className="screen-only" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <Metric icon={<Users size={22} />} label="إجمالي الطلاب" value={stats.totalStudents.toString()} color="#2563eb" />
        <Metric icon={<FileCheck2 size={22} />} label="الشهادات الجاهزة" value={stats.matchedCertificates.toString()} color="#10b981" />
        <Metric icon={<AlertTriangle size={22} />} label="تحتاج مراجعة" value={stats.manualReview.toString()} color="#ef4444" />
        <Metric icon={<Eye size={22} />} label="نسبة الاستلام" value={`${viewPercentage}%`} color="#8b5cf6" />
      </section>

      <section className="screen-only" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 0.55fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={panelStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900 }}>متابعة الاستلام</h2>
              <p className="text-muted" style={{ marginTop: "0.35rem" }}>مقارنة الشهادات التي تم فتحها مع الشهادات التي ما زالت بحاجة متابعة.</p>
            </div>
            <BarChart3 size={28} style={{ color: "#38bdf8" }} />
          </div>
          <div style={{ height: 14, borderRadius: 999, background: "var(--secondary)", overflow: "hidden", marginBottom: "0.85rem" }}>
            <div style={{ height: "100%", width: `${viewPercentage}%`, background: "linear-gradient(90deg, #10b981, #38bdf8)", borderRadius: 999 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", color: "var(--secondary-foreground)", fontWeight: 800 }}>
            <span>تم فتحها: {stats.viewedCertificates}</span>
            <span>لم تفتح: {unviewedList.length}</span>
          </div>
        </div>

        <div style={{ ...panelStyle, background: "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.1))" }}>
          <EyeOff size={30} style={{ color: "#ef4444", marginBottom: "0.75rem" }} />
          <strong style={{ display: "block", fontSize: "2rem", fontWeight: 900 }}>{unviewedList.length}</strong>
          <p className="text-muted" style={{ marginTop: "0.35rem" }}>طالب لم يستلم شهادته بعد</p>
          <span style={{ ...badge("#f59e0b"), marginTop: "0.85rem", display: "inline-flex" }}>{unviewedPercentage}% من الجاهزة</span>
        </div>
      </section>

      <section className="print-scope" style={panelStyle}>
        <div className="print-letterhead" aria-hidden="true">
          <div className="print-letterhead-row">
            <div className="print-right">
              <strong>المملكة العربية السعودية</strong>
              <strong>وزارة التعليم</strong>
              <strong>{schoolName}</strong>
            </div>
            <div className="print-logo">
              <img src={SITE_LOGO} alt="شعار المنصة" />
            </div>
            <div className="print-left">
              <strong>التاريخ: {currentDate}</strong>
            </div>
          </div>
          <div className="print-separator" />
          <h2>قائمة الطلاب الذين لم يستلموا شهاداتهم ({unviewedList.length})</h2>
        </div>

        <div className="screen-only" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid var(--secondary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
            <span style={{ width: 46, height: 46, borderRadius: "0.9rem", display: "grid", placeItems: "center", background: "rgba(239,68,68,0.1)", color: "var(--destructive)" }}>
              <EyeOff size={22} />
            </span>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 900, margin: 0 }}>طلاب لم يستلموا شهاداتهم ({unviewedList.length})</h2>
              <p className="text-muted" style={{ marginTop: "0.25rem" }}>هذا الكشف هو النسخة التي ستظهر بالكليشة عند الطباعة فقط.</p>
            </div>
          </div>
          <button onClick={() => window.print()} style={primaryButton}>
            <Printer size={18} />
            طباعة الكشف
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="report-table">
            <thead>
              <tr>
                <th>م</th>
                <th>اسم الطالب</th>
                <th>رقم الهوية</th>
                <th>الصف والفصل</th>
              </tr>
            </thead>
            <tbody>
              {unviewedList.map((cert, index) => {
                const student = normalizeStudent(cert.students);
                return (
                  <tr key={cert.id}>
                    <td>{index + 1}</td>
                    <td>{student?.name || "-"}</td>
                    <td>{student?.national_id || "-"}</td>
                    <td>{student?.grade_level || "-"} / {student?.classroom || "-"}</td>
                  </tr>
                );
              })}
              {unviewedList.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                    <CheckCircle2 size={26} style={{ color: "#10b981", verticalAlign: "middle", marginLeft: 8 }} />
                    جميع الطلاب استلموا شهاداتهم.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .admin-dashboard {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .report-table {
          width: 100%;
          border-collapse: collapse;
          text-align: right;
          min-width: 680px;
        }

        .report-table th,
        .report-table td {
          padding: 1rem;
          border-bottom: 1px solid var(--secondary);
        }

        .report-table th {
          background: rgba(37, 99, 235, 0.08);
          font-weight: 900;
          color: var(--foreground);
        }

        .report-table tr:hover td {
          background: rgba(37, 99, 235, 0.04);
        }

        .print-letterhead {
          display: none;
        }

        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background: white !important;
            color: black !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-scope,
          .print-scope * {
            visibility: visible !important;
          }

          .print-scope {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }

          .screen-only {
            display: none !important;
          }

          .print-letterhead {
            display: block !important;
            margin-bottom: 18px;
          }

          .print-letterhead-row {
            display: grid !important;
            grid-template-columns: 1fr 120px 1fr;
            align-items: center;
            gap: 16px;
            min-height: 105px;
          }

          .print-right,
          .print-left {
            display: flex !important;
            flex-direction: column;
            gap: 7px;
            font-size: 16px;
            line-height: 1.5;
          }

          .print-right {
            text-align: right;
          }

          .print-left {
            text-align: left;
            align-items: flex-start;
          }

          .print-logo {
            display: flex !important;
            justify-content: center;
            align-items: center;
          }

          .print-logo img {
            width: 92px;
            height: 92px;
            object-fit: contain;
          }

          .print-separator {
            display: block !important;
            border-top: 2px solid black;
            margin: 14px 0 18px;
          }

          .print-letterhead h2 {
            text-align: center;
            font-size: 20px;
            font-weight: 900;
            margin: 0 0 18px;
          }

          .report-table {
            min-width: 0 !important;
            font-size: 13px;
          }

          .report-table th,
          .report-table td {
            border: 1px solid black !important;
            padding: 9px 10px !important;
            color: black !important;
            background: white !important;
          }

          .report-table th {
            background: #f1f5f9 !important;
          }
        }
      `}</style>
    </div>
  );
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ ...panelStyle, padding: "1.15rem" }}>
      <span style={{ width: 42, height: 42, borderRadius: "0.85rem", background: `${color}1A`, color, display: "grid", placeItems: "center", marginBottom: "0.85rem" }}>
        {icon}
      </span>
      <p className="text-muted" style={{ margin: 0, fontWeight: 800 }}>{label}</p>
      <strong style={{ display: "block", marginTop: "0.55rem", color: "var(--foreground)", fontSize: "1.75rem", fontWeight: 900 }}>{value}</strong>
    </div>
  );
}

function normalizeStudent(students: CertificateAnalytics["students"]) {
  if (!students) return null;
  return Array.isArray(students) ? students[0] : students;
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
  borderRadius: "0.8rem",
  border: "none",
  background: "var(--primary)",
  color: "white",
  padding: "0 1rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: "var(--secondary)",
  color: "var(--foreground)",
};
