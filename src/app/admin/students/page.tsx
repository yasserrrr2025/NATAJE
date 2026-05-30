"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle, FileBadge, FileSpreadsheet, Loader2, Pencil, Plus, Save, Search, Trash2, Upload, Users, X } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { getCurrentSchoolId } from "@/lib/school-session";

type StudentRow = {
  id: string;
  school_id?: string;
  name: string;
  national_id: string;
  grade_level: string | null;
  classroom: string | null;
  certificates?: Array<{ id: string }>;
};

type ParsedStudent = {
  name: string;
  national_id: string;
  grade_level: string | null;
  classroom: string | null;
};

type ImportPreview = {
  fileName: string;
  sheetName: string;
  students: ParsedStudent[];
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  toDelete: StudentRow[];
  duplicates: ParsedStudent[];
  errors: string[];
};

const emptyStudentForm = {
  id: "",
  name: "",
  national_id: "",
  grade_level: "",
  classroom: "",
};

export default function StudentsImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState({ upserted: 0, deleted: 0 });
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) =>
      [student.name, student.national_id, student.grade_level, student.classroom]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [students, searchTerm]);

  const loadStudents = async () => {
    setPageLoading(true);
    try {
      const schoolId = getCurrentSchoolId();
      if (!schoolId) {
        setPageLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("students")
        .select(`
          id, school_id, name, national_id, grade_level, classroom,
          certificates ( id )
        `)
        .eq("school_id", schoolId)
        .order("name");

      if (error) throw error;
      setStudents((data || []) as StudentRow[]);
    } catch (err) {
      console.error("Error loading students:", err);
    } finally {
      setPageLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setPreview(null);
    setStatus("idle");
    setMessage("");
  };

  const handleAnalyzeFile = async () => {
    if (!file) return;
    setLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      const nextPreview = await buildImportPreview(file, students);
      setPreview(nextPreview);
      if (nextPreview.errors.length > 0) {
        setStatus("error");
        setMessage("تم تحليل الملف مع وجود ملاحظات تحتاج مراجعة قبل الاعتماد.");
      }
    } catch (err: any) {
      console.error(err);
      setPreview(null);
      setStatus("error");
      setMessage(err.message || "حدث خطأ أثناء تحليل ملف نور.");
    } finally {
      setLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!preview) return;
    const schoolId = getCurrentSchoolId();
    if (!schoolId) {
      setStatus("error");
      setMessage("لا توجد جلسة مدرسة. يرجى تسجيل الدخول مرة أخرى.");
      return;
    }

    setLoading(true);
    setStatus("idle");

    try {
      const studentsToUpsert = preview.students.map((student) => ({
        ...student,
        school_id: schoolId,
      }));

      let deletedCount = 0;
      const idsToDelete = preview.toDelete.map((student) => student.national_id);
      for (let index = 0; index < idsToDelete.length; index += 100) {
        const chunk = idsToDelete.slice(index, index + 100);
        const { error } = await supabase.from("students").delete().eq("school_id", schoolId).in("national_id", chunk);
        if (error) throw error;
        deletedCount += chunk.length;
      }

      const { error: upsertError } = await supabase.from("students").upsert(studentsToUpsert, {
        onConflict: "school_id,national_id",
      });
      if (upsertError) throw upsertError;

      setStats({ upserted: studentsToUpsert.length, deleted: deletedCount });
      setPreview(null);
      setFile(null);
      setStatus("success");
      setMessage("تم اعتماد المزامنة وحفظ التغييرات بنجاح.");
      await loadStudents();
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "تعذر حفظ بيانات الطلاب.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setStudentForm(emptyStudentForm);
    setModalMode("create");
  };

  const openEditModal = (student: StudentRow) => {
    setStudentForm({
      id: student.id,
      name: student.name,
      national_id: student.national_id,
      grade_level: student.grade_level || "",
      classroom: student.classroom || "",
    });
    setModalMode("edit");
  };

  const handleSaveStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    const schoolId = getCurrentSchoolId();
    if (!schoolId) return;

    setLoading(true);
    try {
      const payload = {
        school_id: schoolId,
        name: studentForm.name.trim(),
        national_id: studentForm.national_id.trim(),
        grade_level: studentForm.grade_level.trim() || null,
        classroom: studentForm.classroom.trim() || null,
      };

      const result = modalMode === "create"
        ? await supabase.from("students").upsert(payload, { onConflict: "school_id,national_id" })
        : await supabase.from("students").update(payload).eq("id", studentForm.id);

      if (result.error) throw result.error;
      setModalMode(null);
      setStatus("success");
      setMessage(modalMode === "create" ? "تم إضافة الطالب بنجاح." : "تم تحديث بيانات الطالب بنجاح.");
      await loadStudents();
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "تعذر حفظ بيانات الطالب.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (student: StudentRow) => {
    const certCount = getCertificatesCount(student);
    const warning = certCount > 0
      ? `هذا الطالب لديه ${certCount} شهادة مرتبطة. سيتم فصل الشهادات عنه ونقلها للمراجعة قبل حذف الطالب. هل تريد المتابعة؟`
      : "هل تريد حذف هذا الطالب؟";
    if (!window.confirm(warning)) return;

    setLoading(true);
    try {
      if (certCount > 0) {
        const { error: unlinkError } = await supabase
          .from("certificates")
          .update({ student_id: null, status: "MANUAL_REVIEW_NEEDED" })
          .eq("student_id", student.id);
        if (unlinkError) throw unlinkError;
      }

      const { error } = await supabase.from("students").delete().eq("id", student.id);
      if (error) throw error;
      setStatus("success");
      setMessage("تم حذف الطالب.");
      await loadStudents();
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "تعذر حذف الطالب.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.5rem", color: "var(--primary)", fontWeight: 900 }}>Student Data Hub</p>
          <h1 className="heading-2" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.7rem" }}>
            <Users size={32} style={{ color: "var(--primary)" }} />
            إدارة بيانات الطلاب
          </h1>
          <p className="text-muted" style={{ marginTop: "0.5rem" }}>
            إدارة يدوية كاملة مع استيراد ذكي من نور يعرض الجديد والمحذوف والمكرر والأخطاء قبل الحفظ.
          </p>
        </div>

        <button onClick={openCreateModal} style={primaryButton}>
          <Plus size={20} />
          إضافة طالب
        </button>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem" }}>
        <Metric label="إجمالي الطلاب" value={pageLoading ? "..." : students.length.toString()} color="#2563eb" />
        <Metric label="لديهم شهادات" value={students.filter((student) => getCertificatesCount(student) > 0).length.toString()} color="#10b981" />
        <Metric label="بدون شهادات" value={students.filter((student) => getCertificatesCount(student) === 0).length.toString()} color="#f59e0b" />
      </section>

      <section style={panelStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Upload size={22} style={{ color: "var(--primary)" }} />
              الاستيراد الذكي من نور
            </h2>
            <p className="text-muted" style={{ marginTop: "0.35rem" }}>اختر ملف Excel ثم راجع الفروقات قبل تنفيذ المزامنة.</p>
          </div>
          {preview && (
            <button onClick={() => setPreview(null)} style={secondaryButton}>
              <X size={18} />
              إلغاء المعاينة
            </button>
          )}
        </div>

        <div
          onClick={() => document.getElementById("excel-upload")?.click()}
          style={{
            border: "2px dashed var(--secondary)",
            borderRadius: "1rem",
            padding: "2rem",
            textAlign: "center",
            cursor: "pointer",
            background: file ? "rgba(37,99,235,0.08)" : "var(--background)",
            borderColor: file ? "var(--primary)" : "var(--secondary)",
          }}
        >
          <input id="excel-upload" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} style={{ display: "none" }} />
          <FileSpreadsheet size={46} style={{ color: file ? "var(--primary)" : "var(--secondary-foreground)", marginBottom: "0.75rem" }} />
          <h3 style={{ margin: 0, fontWeight: 900 }}>{file ? file.name : "اختر ملف نور"}</h3>
          <p className="text-muted" style={{ marginTop: "0.45rem" }}>
            يدعم XLSX و XLS و CSV، ويبحث عن ورقة Sheet2 أو أول ورقة متاحة.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <p className="text-muted" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
            <AlertCircle size={17} />
            لن يتم حفظ أي تغيير قبل الضغط على اعتماد المزامنة.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button disabled={!file || loading} onClick={handleAnalyzeFile} style={secondaryButton}>
              {loading && !preview ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
              تحليل الملف
            </button>
            <button disabled={!preview || loading || (preview?.students.length || 0) === 0} onClick={handleCommitImport} style={primaryButton}>
              {loading && preview ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              اعتماد المزامنة
            </button>
          </div>
        </div>
      </section>

      {preview && <ImportPreviewPanel preview={preview} />}

      {status !== "idle" && (
        <div style={{ ...panelStyle, borderRight: `4px solid ${status === "success" ? "var(--accent)" : "var(--destructive)"}`, background: status === "success" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", gap: "0.8rem" }}>
          {status === "success" ? <CheckCircle size={26} style={{ color: "var(--accent)" }} /> : <AlertCircle size={26} style={{ color: "var(--destructive)" }} />}
          <div>
            <strong style={{ display: "block", color: status === "success" ? "var(--accent)" : "var(--destructive)" }}>
              {status === "success" ? "تمت العملية بنجاح" : "تحتاج مراجعة"}
            </strong>
            <p className="text-muted" style={{ marginTop: "0.25rem", fontWeight: 700 }}>
              {message || `تم حفظ ${stats.upserted} طالب وحذف ${stats.deleted} طالب.`}
            </p>
          </div>
        </div>
      )}

      <section style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--secondary)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Users size={22} style={{ color: "var(--primary)" }} />
            قاعدة بيانات الطلاب
          </h2>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", width: "min(360px, 100%)" }}>
              <Search size={18} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--secondary-foreground)", opacity: 0.65 }} />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="بحث بالاسم أو الهوية أو الصف..." style={searchInput} />
            </div>
            <button onClick={loadStudents} disabled={pageLoading} style={secondaryButton}>
              {pageLoading ? <Loader2 className="animate-spin" size={18} /> : "تحديث"}
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto", maxHeight: 640, overflowY: "auto" }}>
          <table style={{ width: "100%", minWidth: 880, borderCollapse: "collapse", textAlign: "right" }}>
            <thead style={{ background: "var(--secondary)", position: "sticky", top: 0, zIndex: 2 }}>
              <tr>
                {["اسم الطالب", "رقم الهوية / الطالب", "الصف والفصل", "الشهادات", "إجراءات"].map((header) => (
                  <th key={header} style={thStyle}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "4rem", textAlign: "center" }}>
                    <Loader2 size={40} className="animate-spin" style={{ color: "var(--primary)", marginBottom: "1rem" }} />
                    <p className="text-muted" style={{ fontWeight: 800 }}>جاري تحميل بيانات الطلاب...</p>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "4rem", textAlign: "center" }}>
                    <Users size={48} style={{ color: "var(--secondary-foreground)", opacity: 0.5, marginBottom: "1rem" }} />
                    <h3 style={{ margin: 0, fontWeight: 900 }}>لا توجد نتائج</h3>
                    <p className="text-muted" style={{ marginTop: "0.5rem" }}>أضف طالباً يدوياً أو استورد ملف نور.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const certCount = getCertificatesCount(student);
                  return (
                    <tr key={student.id} style={{ borderBottom: "1px solid var(--secondary)" }}>
                      <td style={tdStyle}><strong>{student.name}</strong></td>
                      <td style={{ ...tdStyle, color: "var(--primary)", direction: "ltr", textAlign: "right", fontWeight: 900 }}>{student.national_id}</td>
                      <td style={tdStyle}>{student.grade_level || "غير محدد"} {student.classroom ? `/ ${student.classroom}` : ""}</td>
                      <td style={tdStyle}>
                        <span style={badge(certCount > 0 ? "#10b981" : "#64748b")}>
                          <FileBadge size={16} />
                          {certCount > 0 ? `${certCount} شهادة` : "لا توجد شهادات"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                          <button onClick={() => openEditModal(student)} style={iconButton("#2563eb")} title="تعديل الطالب">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDeleteStudent(student)} style={iconButton("#ef4444")} title="حذف الطالب">
                            <Trash2 size={16} />
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
      </section>

      {modalMode && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900 }}>{modalMode === "create" ? "إضافة طالب" : "تعديل طالب"}</h2>
              <button onClick={() => setModalMode(null)} style={iconButton("#64748b")}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} style={{ display: "grid", gap: "1rem" }}>
              <Field label="اسم الطالب">
                <input required value={studentForm.name} onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })} className="input" />
              </Field>
              <Field label="رقم الهوية / الطالب">
                <input required dir="ltr" value={studentForm.national_id} onChange={(event) => setStudentForm({ ...studentForm, national_id: compactId(event.target.value) })} className="input" />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field label="الصف">
                  <input value={studentForm.grade_level} onChange={(event) => setStudentForm({ ...studentForm, grade_level: event.target.value })} className="input" />
                </Field>
                <Field label="الفصل">
                  <input value={studentForm.classroom} onChange={(event) => setStudentForm({ ...studentForm, classroom: event.target.value })} className="input" />
                </Field>
              </div>
              <button type="submit" disabled={loading} style={primaryButton}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                حفظ الطالب
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

async function buildImportPreview(file: File, currentStudents: StudentRow[]): Promise<ImportPreview> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames.includes("Sheet2") ? "Sheet2" : workbook.SheetNames[0];
  if (!sheetName) throw new Error("لا توجد أوراق عمل داخل الملف.");

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { range: 3, header: 1 });
  if (rows.length < 2) throw new Error("لا توجد بيانات كافية في ملف نور.");

  const headers = rows[0] || [];
  const dataRows = rows.slice(1);
  const findIndex = (...names: string[]) =>
    headers.findIndex((header: unknown) => names.some((name) => String(header || "").trim() === name));

  const nameIdx = findIndex("اسم الطالب", "الاسم");
  const idIdx = findIndex("رقم الطالب", "رقم الهوية", "السجل المدني", "رقم السجل المدني");
  const classIdx = findIndex("الفصل", "الشعبة");
  const gradeIdx = findIndex("رقم الصف", "الصف", "المرحلة");

  if (nameIdx === -1 || idIdx === -1) {
    throw new Error("لم يتم العثور على أعمدة اسم الطالب ورقم الطالب/الهوية في ملف نور.");
  }

  const seen = new Set<string>();
  const students: ParsedStudent[] = [];
  const duplicates: ParsedStudent[] = [];
  const errors: string[] = [];

  dataRows.forEach((row, rowIndex) => {
    const nationalId = compactId(row[idIdx]);
    const name = String(row[nameIdx] || "").trim();
    if (!nationalId && !name) return;

    if (!nationalId) {
      errors.push(`صف ${rowIndex + 5}: رقم الطالب مفقود.`);
      return;
    }
    if (!name) {
      errors.push(`صف ${rowIndex + 5}: اسم الطالب مفقود للرقم ${nationalId}.`);
      return;
    }

    const parsed = {
      name,
      national_id: nationalId,
      classroom: classIdx !== -1 && row[classIdx] ? String(row[classIdx]).trim() : null,
      grade_level: gradeIdx !== -1 && row[gradeIdx] ? String(row[gradeIdx]).trim() : null,
    };

    if (seen.has(nationalId)) {
      duplicates.push(parsed);
      return;
    }

    seen.add(nationalId);
    students.push(parsed);
  });

  if (students.length === 0) throw new Error("لم يتم العثور على طلاب صالحين للاستيراد.");

  const currentById = new Map(currentStudents.map((student) => [student.national_id, student]));
  const incomingIds = new Set(students.map((student) => student.national_id));

  let newCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;

  students.forEach((student) => {
    const current = currentById.get(student.national_id);
    if (!current) {
      newCount += 1;
      return;
    }
    const changed =
      current.name !== student.name ||
      (current.grade_level || "") !== (student.grade_level || "") ||
      (current.classroom || "") !== (student.classroom || "");
    if (changed) updatedCount += 1;
    else unchangedCount += 1;
  });

  return {
    fileName: file.name,
    sheetName,
    students,
    newCount,
    updatedCount,
    unchangedCount,
    toDelete: currentStudents.filter((student) => !incomingIds.has(student.national_id)),
    duplicates,
    errors,
  };
}

function ImportPreviewPanel({ preview }: { preview: ImportPreview }) {
  return (
    <section style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900 }}>معاينة المزامنة قبل الحفظ</h2>
          <p className="text-muted" style={{ marginTop: "0.35rem" }}>{preview.fileName} - الورقة: {preview.sheetName}</p>
        </div>
        <span style={badge(preview.errors.length ? "#f59e0b" : "#10b981")}>
          {preview.errors.length ? `${preview.errors.length} ملاحظة` : "جاهز للاعتماد"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.8rem", marginBottom: "1rem" }}>
        <MiniStat label="طلاب جدد" value={preview.newCount} color="#10b981" />
        <MiniStat label="سيتم تحديثهم" value={preview.updatedCount} color="#2563eb" />
        <MiniStat label="بدون تغيير" value={preview.unchangedCount} color="#64748b" />
        <MiniStat label="سيتم حذفهم" value={preview.toDelete.length} color="#ef4444" />
        <MiniStat label="مكررون" value={preview.duplicates.length} color="#f59e0b" />
      </div>

      {(preview.errors.length > 0 || preview.duplicates.length > 0 || preview.toDelete.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.8rem" }}>
          <PreviewList title="الأخطاء" color="#ef4444" items={preview.errors.slice(0, 8)} empty="لا توجد أخطاء" />
          <PreviewList title="المكررون" color="#f59e0b" items={preview.duplicates.slice(0, 8).map((student) => `${student.name} - ${student.national_id}`)} empty="لا يوجد تكرار" />
          <PreviewList title="سيتم حذفهم" color="#ef4444" items={preview.toDelete.slice(0, 8).map((student) => `${student.name} - ${student.national_id}`)} empty="لا يوجد حذف" />
        </div>
      )}
    </section>
  );
}

function PreviewList({ title, items, empty, color }: { title: string; items: string[]; empty: string; color: string }) {
  return (
    <div style={{ background: "var(--background)", border: "1px solid var(--secondary)", borderRadius: "0.9rem", padding: "1rem" }}>
      <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 900, color }}>{title}</h3>
      {items.length === 0 ? (
        <p className="text-muted" style={{ margin: 0 }}>{empty}</p>
      ) : (
        <ul style={{ display: "grid", gap: "0.45rem", paddingRight: "1rem" }}>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: `${color}12`, border: `1px solid ${color}30`, borderRadius: "0.9rem", padding: "0.9rem" }}>
      <p style={{ margin: 0, color, fontWeight: 900 }}>{label}</p>
      <strong style={{ display: "block", marginTop: "0.35rem", fontSize: "1.45rem", color }}>{value}</strong>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ ...panelStyle, padding: "1rem" }}>
      <p className="text-muted" style={{ margin: 0, fontWeight: 800 }}>{label}</p>
      <strong style={{ display: "block", marginTop: "0.45rem", fontSize: "1.7rem", fontWeight: 900, color }}>{value}</strong>
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

function compactId(value: unknown) {
  return String(value || "").replace(/[^\p{L}\p{N}]/gu, "").trim();
}

function getCertificatesCount(student: StudentRow) {
  return student.certificates?.length || 0;
}

function badge(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    width: "fit-content",
    color,
    background: `${color}1A`,
    border: `1px solid ${color}33`,
    borderRadius: "999px",
    padding: "0.35rem 0.75rem",
    fontWeight: 900,
    fontSize: "0.85rem",
    whiteSpace: "nowrap",
  };
}

function iconButton(color: string): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    borderRadius: "0.7rem",
    color,
    background: `${color}14`,
    border: `1px solid ${color}28`,
    display: "inline-grid",
    placeItems: "center",
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

const primaryButton: React.CSSProperties = {
  minHeight: 44,
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

const searchInput: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  borderRadius: "0.85rem",
  border: "1px solid var(--secondary)",
  background: "var(--background)",
  color: "var(--foreground)",
  padding: "0 2.7rem 0 1rem",
  outline: "none",
  fontFamily: "inherit",
  fontWeight: 800,
};

const thStyle: React.CSSProperties = {
  padding: "1rem 1.25rem",
  fontWeight: 900,
  color: "var(--foreground)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "1rem 1.25rem",
  verticalAlign: "middle",
};

const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(15, 23, 42, 0.62)",
  display: "grid",
  placeItems: "center",
  padding: "1rem",
  backdropFilter: "blur(6px)",
};

const modalCard: React.CSSProperties = {
  width: "min(560px, 100%)",
  background: "var(--card)",
  border: "1px solid var(--card-border)",
  borderRadius: "1.1rem",
  boxShadow: "0 24px 80px rgba(15,23,42,0.28)",
  padding: "1.25rem",
};
