"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Printer, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentSchoolId } from "@/lib/school-session";

const SITE_LOGO =
  "https://upload.wikimedia.org/wikipedia/ar/1/17/Saudi_Ministry_of_Education_Logo_2025.png";
const ROWS_PER_PAGE = 22;

type StudentRow = {
  id: string;
  name: string;
  national_id: string;
  grade_level: string | null;
  classroom: string | null;
};

type CertificateRow = {
  id: string;
  viewed_at: string | null;
  students: StudentRow | StudentRow[] | null;
};

export default function UnviewedCertificatesPrintPage() {
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("(اسم المدرسة)");
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [hasSession, setHasSession] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const schoolId = getCurrentSchoolId();
      if (!schoolId) {
        setHasSession(false);
        return;
      }

      const [schoolRes, certsRes] = await Promise.all([
        supabase.from("schools").select("name").eq("id", schoolId).maybeSingle(),
        supabase
          .from("certificates")
          .select("id, viewed_at, students(id, name, national_id, grade_level, classroom)")
          .eq("school_id", schoolId)
          .eq("status", "MATCHED")
          .is("viewed_at", null)
          .order("created_at", { ascending: false }),
      ]);

      if (schoolRes.data?.name) setSchoolName(schoolRes.data.name);
      if (certsRes.error) throw certsRes.error;

      const normalizedRows = ((certsRes.data || []) as CertificateRow[])
        .map((cert) => normalizeStudent(cert.students))
        .filter(Boolean) as StudentRow[];

      setRows(normalizedRows);
    } catch (error) {
      console.error("Unable to load print report:", error);
    } finally {
      setLoading(false);
    }
  };

  const pages = useMemo(() => chunkRows(rows, ROWS_PER_PAGE), [rows]);
  const currentDate = new Date().toLocaleDateString("ar-SA");

  if (loading) {
    return (
      <main className="report-shell">
        <div className="loading-box">
          <Loader2 className="animate-spin" size={36} />
          جاري تجهيز الكشف...
        </div>
        <ReportStyles />
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="report-shell">
        <div className="loading-box">
          لا توجد جلسة مدرسة نشطة.
          <Link href="/login" className="report-link">العودة لتسجيل الدخول</Link>
        </div>
        <ReportStyles />
      </main>
    );
  }

  return (
    <main className="report-shell">
      <div className="report-toolbar">
        <button onClick={() => window.print()} className="toolbar-button primary">
          <Printer size={18} />
          طباعة الكشف
        </button>
        <button onClick={loadReport} className="toolbar-button">
          <RefreshCw size={18} />
          تحديث
        </button>
        <Link href="/admin" className="toolbar-button">
          الرجوع للوحة
        </Link>
      </div>

      {(pages.length ? pages : [[]]).map((pageRows, pageIndex) => (
        <section className="print-page" key={pageIndex}>
          <ReportHeader
            schoolName={schoolName}
            date={currentDate}
            total={rows.length}
            page={pageIndex + 1}
            pages={Math.max(pages.length, 1)}
          />

          <table className="print-table">
            <thead>
              <tr>
                <th className="col-index">م</th>
                <th>اسم الطالب</th>
                <th className="col-id">رقم الهوية</th>
                <th className="col-class">الصف والفصل</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((student, rowIndex) => (
                <tr key={`${student.id}-${rowIndex}`}>
                  <td>{pageIndex * ROWS_PER_PAGE + rowIndex + 1}</td>
                  <td>{student.name}</td>
                  <td>{student.national_id}</td>
                  <td>{student.grade_level || "-"} / {student.classroom || "-"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-cell">جميع الطلاب استلموا شهاداتهم.</td>
                </tr>
              )}
            </tbody>
          </table>

          <footer className="page-footer">
            صفحة {pageIndex + 1} من {Math.max(pages.length, 1)}
          </footer>
        </section>
      ))}

      <ReportStyles />
    </main>
  );
}

function ReportHeader({
  schoolName,
  date,
  total,
}: {
  schoolName: string;
  date: string;
  total: number;
  page: number;
  pages: number;
}) {
  return (
    <header className="report-header">
      <div className="letterhead">
        <div className="identity">
          <strong>المملكة العربية السعودية</strong>
          <strong>وزارة التعليم</strong>
          <strong>{schoolName}</strong>
        </div>
        <div className="logo-wrap">
          <img src={SITE_LOGO} alt="شعار المنصة" />
        </div>
        <div className="date-block">
          <strong>التاريخ: {date}</strong>
        </div>
      </div>
      <div className="separator" />
      <h1>قائمة الطلاب الذين لم يستلموا شهاداتهم ({total})</h1>
    </header>
  );
}

function normalizeStudent(students: CertificateRow["students"]) {
  if (!students) return null;
  return Array.isArray(students) ? students[0] : students;
}

function chunkRows<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

function ReportStyles() {
  return (
    <style>{`
      :root {
        color-scheme: light;
      }

      body {
        background: #5f6368 !important;
        color: #111827 !important;
      }

      .report-shell {
        direction: rtl;
        min-height: 100vh;
        padding: 24px 0 48px;
        font-family: var(--font-cairo), system-ui, sans-serif;
      }

      .report-toolbar {
        width: min(210mm, calc(100vw - 32px));
        margin: 0 auto 18px;
        display: flex;
        gap: 10px;
        justify-content: flex-start;
      }

      .toolbar-button,
      .report-link {
        min-height: 40px;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
        background: white;
        color: #0f172a;
        padding: 0 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 800;
        text-decoration: none;
        cursor: pointer;
      }

      .toolbar-button.primary {
        background: #2563eb;
        color: white;
        border-color: #2563eb;
      }

      .loading-box {
        width: min(520px, calc(100vw - 32px));
        margin: 80px auto;
        background: white;
        border-radius: 16px;
        padding: 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        font-weight: 900;
      }

      .print-page {
        position: relative;
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto 16px;
        padding: 20mm 18mm 18mm;
        background: white;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        overflow: hidden;
        page-break-after: always;
      }

      .print-page:last-of-type {
        page-break-after: auto;
      }

      .letterhead {
        display: grid;
        grid-template-columns: 1fr 120px 1fr;
        align-items: center;
        gap: 14px;
        min-height: 92px;
      }

      .identity {
        display: flex;
        flex-direction: column;
        gap: 6px;
        text-align: right;
        font-size: 15px;
        line-height: 1.45;
      }

      .logo-wrap {
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .logo-wrap img {
        width: 90px;
        height: 90px;
        object-fit: contain;
      }

      .date-block {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        text-align: left;
        font-size: 15px;
      }

      .separator {
        border-top: 2px solid #111827;
        margin: 13px 0 18px;
      }

      .report-header h1 {
        margin: 0 0 18px;
        text-align: center;
        font-size: 20px;
        line-height: 1.5;
        font-weight: 900;
      }

      .print-table {
        width: 100%;
        margin: 0 auto;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 12px;
      }

      .print-table th,
      .print-table td {
        border: 1px solid #111827;
        padding: 7px 8px;
        text-align: center;
        vertical-align: middle;
        overflow-wrap: anywhere;
      }

      .print-table th {
        background: #f1f5f9;
        font-weight: 900;
      }

      .print-table td:nth-child(2),
      .print-table th:nth-child(2) {
        text-align: right;
      }

      .col-index {
        width: 42px;
      }

      .col-id {
        width: 110px;
      }

      .col-class {
        width: 112px;
      }

      .empty-cell {
        padding: 22px !important;
        font-weight: 900;
      }

      .page-footer {
        position: absolute;
        bottom: 9mm;
        left: 18mm;
        right: 18mm;
        text-align: center;
        font-size: 12px;
        font-weight: 800;
        color: #334155;
      }

      @media print {
        @page {
          size: A4;
          margin: 0;
        }

        html,
        body {
          width: 210mm;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .report-shell {
          padding: 0 !important;
          background: white !important;
        }

        .report-toolbar {
          display: none !important;
        }

        .print-page {
          width: 210mm !important;
          min-height: 297mm !important;
          margin: 0 !important;
          box-shadow: none !important;
          break-after: page;
          page-break-after: always;
        }

        .print-page:last-of-type {
          break-after: auto;
          page-break-after: auto;
        }
      }
    `}</style>
  );
}
