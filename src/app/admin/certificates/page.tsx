"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentSchoolId } from "@/lib/school-session";

type CertificateRow = {
  id: string;
  student_id: string | null;
  extracted_national_id: string | null;
  file_url: string | null;
  page_number: number | null;
  status: "MATCHED" | "UNMATCHED" | "MANUAL_REVIEW_NEEDED";
  academic_year: string | null;
  term: string | null;
  viewed_at?: string | null;
  created_at: string | null;
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

type StudentGroup = {
  key: string;
  name: string;
  nationalId: string;
  grade: string;
  classroom: string;
  certs: CertificateRow[];
};

export default function CertificatesManagementPage() {
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewFilter, setViewFilter] = useState("ALL");
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    setLoading(true);
    try {
      const schoolId = getCurrentSchoolId();
      if (!schoolId) {
        setCertificates([]);
        return;
      }

      const { data, error } = await supabase
        .from("certificates")
        .select(`
          id, student_id, extracted_national_id, file_url, page_number, status, academic_year, term, viewed_at, created_at,
          students ( name, national_id, grade_level, classroom )
        `)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCertificates((data || []) as CertificateRow[]);
    } catch (err) {
      console.error("Error loading certificates:", err);
      alert("تعذر تحميل الشهادات.");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: certificates.length,
      matched: certificates.filter((cert) => cert.status === "MATCHED").length,
      needsReview: certificates.filter((cert) => cert.status !== "MATCHED").length,
      viewed: certificates.filter((cert) => cert.viewed_at).length,
    };
  }, [certificates]);

  const filteredCertificates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return certificates.filter((cert) => {
      const student = normalizeStudent(cert.students);
      const matchesSearch =
        !term ||
        [student?.name, student?.national_id, cert.extracted_national_id, cert.term, cert.academic_year]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesStatus = statusFilter === "ALL" || cert.status === statusFilter;
      const matchesView =
        viewFilter === "ALL" ||
        (viewFilter === "VIEWED" && Boolean(cert.viewed_at)) ||
        (viewFilter === "UNVIEWED" && !cert.viewed_at);
      return matchesSearch && matchesStatus && matchesView;
    });
  }, [certificates, searchTerm, statusFilter, viewFilter]);

  const groupedByStudent = useMemo(() => {
    const groups: Record<string, StudentGroup> = {};
    filteredCertificates.forEach((cert) => {
      const student = normalizeStudent(cert.students);
      const key = student?.national_id || cert.extracted_national_id || cert.id;
      if (!groups[key]) {
        groups[key] = {
          key,
          name: student?.name || "طالب غير مربوط",
          nationalId: student?.national_id || cert.extracted_national_id || "-",
          grade: student?.grade_level || "-",
          classroom: student?.classroom || "-",
          certs: [],
        };
      }
      groups[key].certs.push(cert);
    });
    return Object.values(groups);
  }, [filteredCertificates]);

  const handleDelete = async (certId: string, fileUrl: string | null) => {
    if (!window.confirm("هل تريد حذف هذه الشهادة نهائياً؟")) return;

    try {
      const filePath = getStoragePath(fileUrl);
      if (filePath) await supabase.storage.from("certificates").remove([filePath]);

      const { error } = await supabase.from("certificates").delete().eq("id", certId);
      if (error) throw error;

      setCertificates((current) => current.filter((cert) => cert.id !== certId));
    } catch (err) {
      console.error("Delete error:", err);
      alert("تعذر حذف الشهادة.");
    }
  };

  const handleUploadSingle = async (event: React.ChangeEvent<HTMLInputElement>, cert: CertificateRow) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("يرجى اختيار ملف PDF فقط.");
      return;
    }

    setUploadingFor(cert.id);
    try {
      const schoolId = getCurrentSchoolId();
      if (!schoolId) throw new Error("لم يتم العثور على جلسة المدرسة.");

      const fileName = `${schoolId}/${crypto.randomUUID()}_single.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(fileName, file, { contentType: "application/pdf", upsert: true });

      if (uploadError) throw uploadError;

      const oldPath = getStoragePath(cert.file_url);
      if (oldPath) await supabase.storage.from("certificates").remove([oldPath]);

      const { data: publicUrlData } = supabase.storage.from("certificates").getPublicUrl(fileName);
      const { error } = await supabase
        .from("certificates")
        .update({
          file_url: publicUrlData.publicUrl,
          status: "MATCHED",
        })
        .eq("id", cert.id);

      if (error) throw error;
      await loadCertificates();
    } catch (err) {
      console.error("Upload error:", err);
      alert("تعذر تحديث الشهادة.");
    } finally {
      setUploadingFor(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.5rem", color: "var(--primary)", fontWeight: 900 }}>Certificate Operations</p>
          <h1 className="heading-2" style={{ margin: 0 }}>إدارة الشهادات</h1>
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>
            مركز واحد لمراجعة الشهادات، تحديث ملفات PDF، متابعة الاستلام، وحذف الملفات غير الصحيحة.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button onClick={loadCertificates} style={secondaryButton}>
            <RefreshCw size={18} />
            تحديث
          </button>
          <Link href="/admin/upload" style={primaryButton}>
            <Upload size={18} />
            رفع دفعة جديدة
          </Link>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem" }}>
        <Metric icon={<FileText size={22} />} label="إجمالي الشهادات" value={stats.total.toString()} color="#2563eb" />
        <Metric icon={<ShieldCheck size={22} />} label="مطابقة وجاهزة" value={stats.matched.toString()} color="#10b981" />
        <Metric icon={<AlertTriangle size={22} />} label="تحتاج مراجعة" value={stats.needsReview.toString()} color="#f59e0b" />
        <Metric icon={<Eye size={22} />} label="تم فتحها" value={stats.viewed.toString()} color="#8b5cf6" />
      </section>

      <section style={panelStyle}>
        <div className="certificate-filter-grid" style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) auto auto", gap: "0.75rem", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--secondary-foreground)", opacity: 0.65 }} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث باسم الطالب، رقم الهوية، العام، أو الفصل..."
              style={inputStyle}
            />
          </div>

          <SegmentedFilter
            icon={<Filter size={16} />}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              ["ALL", "كل الحالات"],
              ["MATCHED", "جاهزة"],
              ["MANUAL_REVIEW_NEEDED", "مراجعة"],
              ["UNMATCHED", "غير مطابقة"],
            ]}
          />

          <SegmentedFilter
            value={viewFilter}
            onChange={setViewFilter}
            options={[
              ["ALL", "الكل"],
              ["VIEWED", "مستلمة"],
              ["UNVIEWED", "لم تستلم"],
            ]}
          />
        </div>
      </section>

      {loading ? (
        <div className="flex-center" style={{ minHeight: "35vh", flexDirection: "column", gap: "1rem" }}>
          <Loader2 className="animate-spin" size={44} style={{ color: "var(--primary)" }} />
          <p className="text-muted" style={{ fontWeight: 800 }}>جاري تحميل الشهادات...</p>
        </div>
      ) : (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
          {groupedByStudent.map((student) => (
            <article key={student.key} style={cardStyle}>
              <header style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--secondary)" }}>
                <div>
                  <h2 style={{ margin: 0, color: "var(--foreground)", fontSize: "1.12rem", fontWeight: 900 }}>{student.name}</h2>
                  <p className="text-muted" style={{ marginTop: "0.35rem", fontWeight: 800, direction: "ltr", textAlign: "right" }}>{student.nationalId}</p>
                  <p className="text-muted" style={{ marginTop: "0.25rem" }}>{student.grade} / {student.classroom}</p>
                </div>
                <span style={badge("#2563eb")}>{student.certs.length} شهادة</span>
              </header>

              <div style={{ display: "grid", gap: "0.75rem" }}>
                {student.certs.map((cert, index) => (
                  <div key={cert.id} style={certificateRowStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                      <span style={{ width: 38, height: 38, borderRadius: "0.8rem", display: "grid", placeItems: "center", background: statusColor(cert.status) + "1A", color: statusColor(cert.status), flex: "0 0 auto" }}>
                        {cert.status === "MATCHED" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {cert.term || `شهادة ${index + 1}`}
                        </strong>
                        <span className="text-muted" style={{ display: "block", fontSize: "0.82rem", marginTop: 2 }}>
                          {cert.academic_year || "عام غير محدد"} - صفحة {cert.page_number || "-"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", justifyContent: "space-between", marginTop: "0.75rem", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                        <span style={badge(statusColor(cert.status))}>{statusLabel(cert.status)}</span>
                        <span style={badge(cert.viewed_at ? "#10b981" : "#64748b")}>
                          {cert.viewed_at ? "مستلمة" : "لم تستلم"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "var(--background)", border: "1px solid var(--secondary)", borderRadius: "0.75rem", padding: "0.25rem" }}>
                        {cert.file_url && (
                          <a href={cert.file_url} target="_blank" rel="noreferrer" style={iconButton("#2563eb")} title="معاينة الشهادة">
                            <Eye size={16} />
                          </a>
                        )}
                        <label style={iconButton("#0ea5e9")} title="تحديث ملف الشهادة">
                          {uploadingFor === cert.id ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                          <input
                            type="file"
                            accept=".pdf"
                            style={{ display: "none" }}
                            onChange={(event) => handleUploadSingle(event, cert)}
                            disabled={uploadingFor === cert.id}
                          />
                        </label>
                        <button onClick={() => handleDelete(cert.id, cert.file_url)} style={iconButton("#ef4444")} title="حذف الشهادة">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}

          {groupedByStudent.length === 0 && (
            <div style={{ ...panelStyle, gridColumn: "1 / -1", textAlign: "center", padding: "4rem 1rem", borderStyle: "dashed" }}>
              <FileText size={52} style={{ color: "var(--secondary-foreground)", opacity: 0.45, marginBottom: "1rem" }} />
              <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900 }}>لا توجد شهادات مطابقة</h2>
              <p className="text-muted" style={{ marginTop: "0.5rem" }}>غيّر الفلاتر أو ارفع دفعة جديدة من ملفات PDF.</p>
            </div>
          )}
        </section>
      )}

      <style>{`
        @media (max-width: 900px) {
          .certificate-filter-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function SegmentedFilter({
  icon,
  value,
  onChange,
  options,
}: {
  icon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "var(--background)", border: "1px solid var(--secondary)", borderRadius: "0.9rem", padding: "0.3rem", overflowX: "auto" }}>
      {icon && <span style={{ color: "var(--secondary-foreground)", opacity: 0.7, padding: "0 0.35rem" }}>{icon}</span>}
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          onClick={() => onChange(optionValue)}
          style={{
            border: "none",
            borderRadius: "0.7rem",
            background: value === optionValue ? "var(--primary)" : "transparent",
            color: value === optionValue ? "white" : "var(--secondary-foreground)",
            padding: "0.65rem 0.85rem",
            fontWeight: 900,
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          {label}
        </button>
      ))}
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

function normalizeStudent(students: CertificateRow["students"]) {
  if (!students) return null;
  return Array.isArray(students) ? students[0] : students;
}

function getStoragePath(fileUrl: string | null) {
  if (!fileUrl) return null;
  const marker = "/certificates/";
  const [, path] = fileUrl.split(marker);
  return path || null;
}

function statusLabel(status: CertificateRow["status"]) {
  const labels = {
    MATCHED: "جاهزة",
    MANUAL_REVIEW_NEEDED: "مراجعة",
    UNMATCHED: "غير مطابقة",
  };
  return labels[status];
}

function statusColor(status: CertificateRow["status"]) {
  const colors = {
    MATCHED: "#10b981",
    MANUAL_REVIEW_NEEDED: "#f59e0b",
    UNMATCHED: "#ef4444",
  };
  return colors[status];
}

function badge(color: string): React.CSSProperties {
  return {
    color,
    background: `${color}1A`,
    border: `1px solid ${color}33`,
    borderRadius: "999px",
    padding: "0.3rem 0.65rem",
    fontWeight: 900,
    fontSize: "0.78rem",
    whiteSpace: "nowrap",
  };
}

function iconButton(color: string): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: "0.65rem",
    color,
    background: `${color}14`,
    display: "inline-grid",
    placeItems: "center",
    border: "none",
    cursor: "pointer",
  };
}

const panelStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--card-border)",
  borderRadius: "1rem",
  boxShadow: "var(--shadow-lg)",
  padding: "1.25rem",
};

const cardStyle: React.CSSProperties = {
  ...panelStyle,
  padding: "1.1rem",
  display: "flex",
  flexDirection: "column",
};

const certificateRowStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.35)",
  border: "1px solid var(--secondary)",
  borderRadius: "0.95rem",
  padding: "0.9rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 46,
  borderRadius: "0.9rem",
  border: "1px solid var(--secondary)",
  background: "var(--background)",
  color: "var(--foreground)",
  outline: "none",
  padding: "0 2.75rem 0 1rem",
  fontFamily: "inherit",
  fontWeight: 700,
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
  textDecoration: "none",
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: "var(--secondary)",
  color: "var(--foreground)",
};
