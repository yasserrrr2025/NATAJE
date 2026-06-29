"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Eye,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentSchoolId } from "@/lib/school-session";

type CertificateStatus = "MATCHED" | "UNMATCHED" | "MANUAL_REVIEW_NEEDED";

type ReviewCertificate = {
  id: string;
  extracted_national_id: string | null;
  file_url: string | null;
  page_number: number | null;
  status: CertificateStatus;
  academic_year: string | null;
  term: string | null;
  created_at: string | null;
};

type StudentRow = {
  id: string;
  name: string;
  national_id: string;
  grade_level: string | null;
  classroom: string | null;
};

type Notice = {
  type: "success" | "error";
  text: string;
};

export default function ReviewPage() {
  const [certificates, setCertificates] = useState<ReviewCertificate[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedCertificateId, setSelectedCertificateId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [identityInput, setIdentityInput] = useState("");
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [classroomFilter, setClassroomFilter] = useState("ALL");
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    loadReviewData();
  }, []);

  const selectedCertificate = useMemo(
    () => certificates.find((certificate) => certificate.id === selectedCertificateId) || certificates[0] || null,
    [certificates, selectedCertificateId],
  );
  const selectedCertificateKey = selectedCertificate?.id || null;
  const selectedCertificateIdentity = selectedCertificate?.extracted_national_id || "";

  useEffect(() => {
    if (!selectedCertificateKey) return;
    setSelectedCertificateId(selectedCertificateKey);
    setIdentityInput(selectedCertificateIdentity);
    setSelectedStudentId(null);
    setNotice(null);
  }, [selectedCertificateKey, selectedCertificateIdentity]);

  const stats = useMemo(() => {
    return {
      total: certificates.length,
      withIdentity: certificates.filter((certificate) => Boolean(certificate.extracted_national_id)).length,
      withoutIdentity: certificates.filter((certificate) => !certificate.extracted_national_id).length,
    };
  }, [certificates]);

  const gradeOptions = useMemo(() => uniqueOptions(students.map((student) => student.grade_level)), [students]);
  const classroomOptions = useMemo(() => {
    const source = gradeFilter === "ALL" ? students : students.filter((student) => student.grade_level === gradeFilter);
    return uniqueOptions(source.map((student) => student.classroom));
  }, [students, gradeFilter]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) || null,
    [students, selectedStudentId],
  );

  const exactIdentityStudent = useMemo(() => {
    const identity = normalizeIdentity(identityInput);
    if (!identity) return null;
    return students.find((student) => student.national_id === identity) || null;
  }, [students, identityInput]);

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const identity = normalizeIdentity(identityInput);

    return students
      .filter((student) => gradeFilter === "ALL" || student.grade_level === gradeFilter)
      .filter((student) => classroomFilter === "ALL" || student.classroom === classroomFilter)
      .filter((student) => {
        if (!term && !identity) return true;
        const values = [student.name, student.national_id, student.grade_level, student.classroom]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        const matchesTerm = term ? values.some((value) => value.includes(term)) : true;
        const matchesIdentity = identity && !term ? student.national_id.includes(identity) : true;
        return matchesTerm && matchesIdentity;
      })
      .sort((first, second) => {
        if (identityInput && first.national_id === normalizeIdentity(identityInput)) return -1;
        if (identityInput && second.national_id === normalizeIdentity(identityInput)) return 1;
        return first.name.localeCompare(second.name, "ar");
      })
      .slice(0, 18);
  }, [students, searchTerm, identityInput, gradeFilter, classroomFilter]);

  const loadReviewData = async () => {
    setLoading(true);
    setNotice(null);

    try {
      const currentSchoolId = getCurrentSchoolId();
      setSchoolId(currentSchoolId);

      if (!currentSchoolId) {
        setCertificates([]);
        setStudents([]);
        return;
      }

      const [certificatesResult, studentsResult] = await Promise.all([
        supabase
          .from("certificates")
          .select("id, extracted_national_id, file_url, page_number, status, academic_year, term, created_at")
          .eq("school_id", currentSchoolId)
          .neq("status", "MATCHED")
          .order("created_at", { ascending: false }),
        supabase
          .from("students")
          .select("id, name, national_id, grade_level, classroom")
          .eq("school_id", currentSchoolId)
          .order("name", { ascending: true }),
      ]);

      if (certificatesResult.error) throw certificatesResult.error;
      if (studentsResult.error) throw studentsResult.error;

      const nextCertificates = (certificatesResult.data || []) as ReviewCertificate[];
      setCertificates(nextCertificates);
      setStudents((studentsResult.data || []) as StudentRow[]);
      setSelectedCertificateId((current) =>
        current && nextCertificates.some((certificate) => certificate.id === current)
          ? current
          : nextCertificates[0]?.id || null,
      );
    } catch (error) {
      console.error("Error loading review data:", error);
      setNotice({ type: "error", text: "تعذر تحميل بيانات المراجعة. حاول التحديث مرة أخرى." });
    } finally {
      setLoading(false);
    }
  };

  const handleIdentityChange = (value: string) => {
    setIdentityInput(value.replace(/[^\p{L}\p{N}]/gu, ""));
    setSelectedStudentId(null);
  };

  const handleUseExtractedIdentity = () => {
    if (!selectedCertificate?.extracted_national_id) return;
    setIdentityInput(selectedCertificate.extracted_national_id);
    setSearchTerm("");
    setSelectedStudentId(null);
  };

  const handleExactIdentitySearch = () => {
    if (!identityInput) {
      setNotice({ type: "error", text: "أدخل رقم الهوية أولاً." });
      return;
    }

    if (!exactIdentityStudent) {
      setNotice({ type: "error", text: "لم يتم العثور على طالب بهذه الهوية داخل بيانات المدرسة." });
      return;
    }

    setSelectedStudentId(exactIdentityStudent.id);
    setNotice({ type: "success", text: "تم العثور على الطالب. راجع المعاينة ثم اعتمد الربط." });
  };

  const handleLinkCertificate = async (student = selectedStudent) => {
    if (!selectedCertificate || !student || !schoolId) return;

    setSaving(true);
    setNotice(null);

    try {
      const identity = normalizeIdentity(identityInput) || student.national_id;
      const { error } = await supabase
        .from("certificates")
        .update({
          student_id: student.id,
          extracted_national_id: identity,
          status: "MATCHED",
        })
        .eq("id", selectedCertificate.id)
        .eq("school_id", schoolId);

      if (error) throw error;

      const remaining = certificates.filter((certificate) => certificate.id !== selectedCertificate.id);
      setCertificates(remaining);
      setSelectedCertificateId(remaining[0]?.id || null);
      setSelectedStudentId(null);
      setSearchTerm("");
      setIdentityInput(remaining[0]?.extracted_national_id || "");
      setNotice({ type: "success", text: `تم ربط الشهادة بالطالب ${student.name}.` });
    } catch (error) {
      console.error("Link certificate error:", error);
      setNotice({ type: "error", text: "تعذر حفظ الربط. تأكد من الصلاحيات أو أعد المحاولة." });
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setGradeFilter("ALL");
    setClassroomFilter("ALL");
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <section style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.35rem", color: "var(--primary)", fontWeight: 900 }}>Manual Matching Desk</p>
          <h1 className="heading-2" style={{ margin: 0 }}>المراجعة والربط اليدوي</h1>
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>
            افتح الشهادة، اكتب الهوية أو اختر الطالب من البحث السريع، ثم اعتمد الربط مباشرة.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Metric label="معلقة" value={stats.total} color="#f59e0b" />
          <Metric label="بهوية مقروءة" value={stats.withIdentity} color="#2563eb" />
          <Metric label="بدون هوية" value={stats.withoutIdentity} color="#ef4444" />
          <button onClick={loadReviewData} disabled={loading} style={secondaryButton}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
            تحديث
          </button>
        </div>
      </section>

      {notice && (
        <div style={{ ...noticeStyle, borderColor: notice.type === "success" ? "#10b981" : "#ef4444" }}>
          {notice.type === "success" ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span>{notice.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex-center" style={{ minHeight: "45vh", flexDirection: "column", gap: "1rem" }}>
          <Loader2 className="animate-spin" size={44} style={{ color: "var(--primary)" }} />
          <p className="text-muted" style={{ fontWeight: 800 }}>جاري تجهيز شاشة المراجعة...</p>
        </div>
      ) : certificates.length === 0 ? (
        <section style={{ ...panelStyle, padding: "4rem 1rem", textAlign: "center", borderStyle: "dashed" }}>
          <Check size={54} style={{ color: "#10b981", marginBottom: "1rem" }} />
          <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 900 }}>لا توجد شهادات معلقة</h2>
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>كل الشهادات الحالية مربوطة بطلاب.</p>
        </section>
      ) : (
        <section className="review-workspace" style={{ display: "grid", gridTemplateColumns: "270px minmax(420px, 1fr) 390px", gap: "1rem", alignItems: "stretch" }}>
          <aside style={{ ...panelStyle, padding: "0.75rem", overflow: "hidden" }}>
            <div style={{ padding: "0.5rem 0.5rem 0.75rem" }}>
              <strong style={{ display: "block", fontSize: "0.95rem" }}>قائمة الشهادات</strong>
              <span className="text-muted" style={{ fontSize: "0.82rem" }}>{certificates.length} شهادة تحتاج إجراء</span>
            </div>

            <div style={{ display: "grid", gap: "0.55rem", maxHeight: "72vh", overflowY: "auto", paddingInlineEnd: "0.25rem" }}>
              {certificates.map((certificate, index) => {
                const active = certificate.id === selectedCertificate?.id;
                return (
                  <button
                    key={certificate.id}
                    onClick={() => setSelectedCertificateId(certificate.id)}
                    style={{
                      ...certificateListButton,
                      borderColor: active ? "var(--primary)" : "var(--secondary)",
                      background: active ? "rgba(37, 99, 235, 0.12)" : "var(--background)",
                    }}
                  >
                    <span style={{ width: 34, height: 34, borderRadius: 8, display: "grid", placeItems: "center", background: active ? "var(--primary)" : "var(--secondary)", color: active ? "white" : "var(--secondary-foreground)", flex: "0 0 auto" }}>
                      {index + 1}
                    </span>
                    <span style={{ minWidth: 0, textAlign: "right" }}>
                      <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {certificate.extracted_national_id || "بدون هوية"}
                      </strong>
                      <small className="text-muted" style={{ display: "block", marginTop: 2 }}>
                        صفحة {certificate.page_number || "-"} - {statusLabel(certificate.status)}
                      </small>
                    </span>
                    <ChevronLeft size={16} style={{ marginInlineStart: "auto", opacity: active ? 1 : 0.45 }} />
                  </button>
                );
              })}
            </div>
          </aside>

          <main style={{ ...panelStyle, padding: 0, overflow: "hidden", minHeight: "74vh" }}>
            <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "0 1rem", borderBottom: "1px solid var(--secondary)" }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedCertificate?.term || "شهادة معلقة"}
                </strong>
                <span className="text-muted" style={{ fontSize: "0.82rem" }}>
                  {selectedCertificate?.academic_year || "عام غير محدد"} - صفحة {selectedCertificate?.page_number || "-"}
                </span>
              </div>
              <a
                href={selectedCertificate?.file_url || "#"}
                target="_blank"
                rel="noreferrer"
                style={{ ...iconTextButton, pointerEvents: selectedCertificate?.file_url ? "auto" : "none", opacity: selectedCertificate?.file_url ? 1 : 0.5 }}
              >
                <Eye size={17} />
                فتح
              </a>
            </div>

            {selectedCertificate?.file_url ? (
              <iframe
                src={`${selectedCertificate.file_url}#toolbar=1&navpanes=0&view=FitH`}
                title="معاينة الشهادة"
                style={{ width: "100%", height: "calc(74vh - 54px)", minHeight: 620, border: 0, background: "#525659" }}
              />
            ) : (
              <div className="flex-center" style={{ minHeight: 620, flexDirection: "column", gap: "0.75rem" }}>
                <FileText size={48} style={{ opacity: 0.45 }} />
                <p className="text-muted">لا يوجد ملف PDF مرتبط بهذه الشهادة.</p>
              </div>
            )}
          </main>

          <aside style={{ ...panelStyle, padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", minHeight: "74vh" }}>
            <section>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                <div>
                  <strong style={{ display: "block", fontSize: "1rem" }}>ربط الشهادة</strong>
                  <span className="text-muted" style={{ fontSize: "0.82rem" }}>ابحث بالهوية أو الاسم</span>
                </div>
                <span style={statusBadge(selectedCertificate?.status || "UNMATCHED")}>{statusLabel(selectedCertificate?.status || "UNMATCHED")}</span>
              </div>
            </section>

            <section style={{ display: "grid", gap: "0.7rem" }}>
              <label className="label" style={{ margin: 0 }}>رقم الهوية</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem" }}>
                <input
                  value={identityInput}
                  onChange={(event) => handleIdentityChange(event.target.value)}
                  className="input"
                  placeholder="اكتب الهوية أو الجواز"
                  style={{ direction: "ltr", textAlign: "left", fontWeight: 800 }}
                />
                <button onClick={handleExactIdentitySearch} disabled={saving} style={primarySquareButton} title="بحث بالهوية">
                  <Search size={18} />
                </button>
              </div>

              {selectedCertificate?.extracted_national_id && (
                <button onClick={handleUseExtractedIdentity} style={softButton}>
                  <UserCheck size={16} />
                  استخدام الهوية المقروءة: {selectedCertificate.extracted_national_id}
                </button>
              )}

              {exactIdentityStudent && (
                <button onClick={() => setSelectedStudentId(exactIdentityStudent.id)} style={exactMatchButton}>
                  <Check size={17} />
                  تطابق مباشر: {exactIdentityStudent.name}
                </button>
              )}
            </section>

            <section style={{ display: "grid", gap: "0.7rem" }}>
              <label className="label" style={{ margin: 0 }}>البحث والفلترة</label>
              <div style={{ position: "relative" }}>
                <Search size={17} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.55 }} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="input"
                  placeholder="اسم الطالب، الهوية، الصف..."
                  style={{ paddingRight: 38 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <select value={gradeFilter} onChange={(event) => { setGradeFilter(event.target.value); setClassroomFilter("ALL"); }} style={selectStyle}>
                  <option value="ALL">كل الصفوف</option>
                  {gradeOptions.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                </select>
                <select value={classroomFilter} onChange={(event) => setClassroomFilter(event.target.value)} style={selectStyle}>
                  <option value="ALL">كل الفصول</option>
                  {classroomOptions.map((classroom) => <option key={classroom} value={classroom}>{classroom}</option>)}
                </select>
              </div>

              {(searchTerm || gradeFilter !== "ALL" || classroomFilter !== "ALL") && (
                <button onClick={resetFilters} style={softButton}>
                  <X size={16} />
                  مسح الفلاتر
                </button>
              )}
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: "0.55rem", minHeight: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                <strong style={{ fontSize: "0.95rem" }}>نتائج الطلاب</strong>
                <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                  {filteredStudents.length} من {students.length}
                </span>
              </div>

              <div style={{ display: "grid", gap: "0.45rem", overflowY: "auto", maxHeight: "35vh", paddingInlineEnd: 2 }}>
                {filteredStudents.map((student) => {
                  const active = student.id === selectedStudentId;
                  return (
                    <button
                      key={student.id}
                      onClick={() => {
                        setSelectedStudentId(student.id);
                        setIdentityInput(student.national_id);
                      }}
                      style={{
                        ...studentButton,
                        borderColor: active ? "var(--primary)" : "var(--secondary)",
                        background: active ? "rgba(37, 99, 235, 0.12)" : "var(--background)",
                      }}
                    >
                      <span style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", background: active ? "var(--primary)" : "var(--secondary)", color: active ? "white" : "var(--secondary-foreground)", flex: "0 0 auto" }}>
                        {active ? <Check size={17} /> : <UserCheck size={17} />}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{student.name}</strong>
                        <small className="text-muted" style={{ display: "block", direction: "ltr", textAlign: "right" }}>{student.national_id}</small>
                        <small className="text-muted" style={{ display: "block" }}>{student.grade_level || "-"} / {student.classroom || "-"}</small>
                      </span>
                    </button>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div style={{ border: "1px dashed var(--secondary)", borderRadius: 8, padding: "1.5rem 1rem", textAlign: "center" }}>
                    <Filter size={28} style={{ opacity: 0.45, marginBottom: "0.5rem" }} />
                    <p className="text-muted">لا توجد نتائج مطابقة للفلاتر الحالية.</p>
                  </div>
                )}
              </div>
            </section>

            <section style={{ borderTop: "1px solid var(--secondary)", paddingTop: "1rem", display: "grid", gap: "0.75rem" }}>
              {selectedStudent && (
                <div style={{ border: "1px solid rgba(16, 185, 129, 0.35)", background: "rgba(16, 185, 129, 0.1)", borderRadius: 8, padding: "0.85rem" }}>
                  <strong style={{ display: "block" }}>{selectedStudent.name}</strong>
                  <span className="text-muted" style={{ display: "block", marginTop: 3, direction: "ltr", textAlign: "right" }}>{selectedStudent.national_id}</span>
                </div>
              )}

              <button
                onClick={() => handleLinkCertificate()}
                disabled={!selectedStudent || saving}
                style={{
                  ...primaryActionButton,
                  opacity: !selectedStudent || saving ? 0.55 : 1,
                  cursor: !selectedStudent || saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? <Loader2 className="animate-spin" size={19} /> : <Check size={19} />}
                اعتماد الربط
              </button>
            </section>
          </aside>
        </section>
      )}

      <style>{`
        @media (max-width: 1200px) {
          .review-workspace {
            grid-template-columns: 230px minmax(360px, 1fr) !important;
          }
          .review-workspace > aside:last-child {
            grid-column: 1 / -1;
            min-height: auto !important;
          }
        }

        @media (max-width: 820px) {
          .review-workspace {
            grid-template-columns: 1fr !important;
          }
          .review-workspace iframe {
            min-height: 520px !important;
          }
        }
      `}</style>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ border: "1px solid var(--secondary)", background: "var(--card)", borderRadius: 8, padding: "0.55rem 0.75rem", minWidth: 88 }}>
      <span className="text-muted" style={{ display: "block", fontSize: "0.75rem", fontWeight: 800 }}>{label}</span>
      <strong style={{ display: "block", marginTop: 2, color, fontSize: "1.15rem" }}>{value}</strong>
    </div>
  );
}

function uniqueOptions(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "ar"));
}

function normalizeIdentity(value: string) {
  return value.replace(/[^\p{L}\p{N}]/gu, "").trim();
}

function statusLabel(status: CertificateStatus) {
  return {
    MATCHED: "مطابقة",
    MANUAL_REVIEW_NEEDED: "تحتاج مراجعة",
    UNMATCHED: "غير مطابقة",
  }[status];
}

function statusBadge(status: CertificateStatus) {
  const color = status === "UNMATCHED" ? "#ef4444" : status === "MANUAL_REVIEW_NEEDED" ? "#f59e0b" : "#10b981";
  return {
    color,
    background: `${color}1A`,
    border: `1px solid ${color}40`,
    borderRadius: 999,
    padding: "0.3rem 0.65rem",
    fontSize: "0.78rem",
    fontWeight: 900,
    whiteSpace: "nowrap",
  } as React.CSSProperties;
}

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--secondary)",
  background: "var(--card)",
  borderRadius: 8,
  boxShadow: "var(--shadow-sm)",
};

const secondaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.45rem",
  border: "1px solid var(--secondary)",
  background: "var(--card)",
  color: "var(--foreground)",
  borderRadius: 8,
  padding: "0.65rem 0.85rem",
  fontWeight: 900,
};

const iconTextButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.4rem",
  border: "1px solid var(--secondary)",
  background: "var(--background)",
  borderRadius: 8,
  padding: "0.5rem 0.75rem",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const primarySquareButton: React.CSSProperties = {
  width: 44,
  borderRadius: 8,
  background: "var(--primary)",
  color: "white",
  display: "grid",
  placeItems: "center",
};

const primaryActionButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.55rem",
  borderRadius: 8,
  background: "var(--primary)",
  color: "white",
  minHeight: 46,
  fontWeight: 900,
  opacity: 1,
};

const softButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.45rem",
  border: "1px solid var(--secondary)",
  borderRadius: 8,
  background: "var(--background)",
  color: "var(--secondary-foreground)",
  padding: "0.62rem 0.75rem",
  fontWeight: 850,
};

const exactMatchButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.45rem",
  border: "1px solid rgba(16, 185, 129, 0.35)",
  borderRadius: 8,
  background: "rgba(16, 185, 129, 0.12)",
  color: "#059669",
  padding: "0.62rem 0.75rem",
  fontWeight: 900,
};

const selectStyle: React.CSSProperties = {
  border: "1px solid var(--secondary)",
  background: "var(--background)",
  color: "var(--foreground)",
  borderRadius: 8,
  padding: "0.7rem",
  fontFamily: "inherit",
  fontWeight: 800,
  minWidth: 0,
};

const noticeStyle: React.CSSProperties = {
  border: "1px solid",
  background: "var(--card)",
  borderRadius: 8,
  padding: "0.75rem 1rem",
  display: "flex",
  alignItems: "center",
  gap: "0.65rem",
  fontWeight: 850,
};

const certificateListButton: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "0.65rem",
  border: "1px solid",
  borderRadius: 8,
  padding: "0.65rem",
  color: "var(--foreground)",
  textAlign: "right",
  minWidth: 0,
};

const studentButton: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "0.65rem",
  border: "1px solid",
  borderRadius: 8,
  padding: "0.65rem",
  color: "var(--foreground)",
  textAlign: "right",
  minWidth: 0,
};
