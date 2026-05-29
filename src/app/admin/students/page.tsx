"use client";

import { useState, useEffect } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Users, FileBadge } from "lucide-react";
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { getCurrentSchoolId } from "@/lib/school-session";

export default function StudentsImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState({ inserted: 0, deleted: 0 });
  const [students, setStudents] = useState<any[]>([]);

  // Load existing students on mount
  const loadStudents = async () => {
    setPageLoading(true);
    try {
      const schoolId = getCurrentSchoolId();

      if (!schoolId) {
        setPageLoading(false);
        return;
      }

      // Fetch students with their certificates count
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, name, national_id, grade_level, classroom,
          certificates ( id )
        `)
        .eq('school_id', schoolId)
        .order('name');

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error("Error loading students:", err);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus("idle");
      setMessage("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setStatus("idle");
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      const sheetName = 'Sheet2';
      if (!workbook.SheetNames.includes(sheetName)) {
        throw new Error("لم يتم العثور على ورقة العمل Sheet2 في الملف. تأكد أن الملف من نظام نور.");
      }
      
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { range: 3, header: 1 });
      
      if (rows.length < 2) {
        throw new Error("لا توجد بيانات كافية في الورقة بدءاً من الصف الرابع.");
      }

      const headers = rows[0] || [];
      const dataRows = rows.slice(1);

      const findIndex = (name: string) => headers.findIndex((h: any) => typeof h === 'string' && h.trim() === name);
      const nameIdx = findIndex("اسم الطالب");
      const idIdx = findIndex("رقم الطالب");
      const classIdx = findIndex("الفصل");
      const gradeIdx = findIndex("رقم الصف");

      if (nameIdx === -1 || idIdx === -1) {
        throw new Error("لم يتم العثور على الأعمدة المطلوبة: 'اسم الطالب' و 'رقم الطالب'. يرجى التأكد من رؤوس الأعمدة.");
      }

      const parsedStudents = dataRows
        .filter(row => row[idIdx] && String(row[idIdx]).trim() !== "")
        .map(row => ({
          name: row[nameIdx] ? String(row[nameIdx]).trim() : "غير معروف",
          national_id: String(row[idIdx]).trim(),
          classroom: classIdx !== -1 && row[classIdx] ? String(row[classIdx]).trim() : null,
          grade_level: gradeIdx !== -1 && row[gradeIdx] ? String(row[gradeIdx]).trim() : null,
        }));

      if (parsedStudents.length === 0) {
        throw new Error("لم يتم العثور على أي طلاب ببيانات صحيحة للاستيراد.");
      }

      const schoolId = getCurrentSchoolId();

      if (!schoolId) throw new Error("لا يوجد مدرسة مسجلة. يرجى تسجيل الدخول.");

      const studentsToInsert = parsedStudents.map(s => ({
        ...s,
        school_id: schoolId
      }));

      // FULL SYNC LOGIC
      // 1. Get current students IDs
      const { data: currentStudents } = await supabase
        .from('students')
        .select('national_id')
        .eq('school_id', schoolId);
        
      const newNationalIds = new Set(studentsToInsert.map(s => s.national_id));
      const currentNationalIds = (currentStudents || []).map(s => s.national_id);
      
      // 2. Find students to delete (exist in DB but not in new file)
      const toDelete = currentNationalIds.filter(id => !newNationalIds.has(id));
      
      let deletedCount = 0;
      if (toDelete.length > 0) {
        // Delete in chunks if necessary, but Supabase can handle a few hundred IN clauses
        const chunkSize = 100;
        for (let i = 0; i < toDelete.length; i += chunkSize) {
          const chunk = toDelete.slice(i, i + chunkSize);
          await supabase.from('students').delete().eq('school_id', schoolId).in('national_id', chunk);
          deletedCount += chunk.length;
        }
      }

      // 3. Upsert the new data
      const { error: insertError } = await supabase.from('students').upsert(studentsToInsert, { 
        onConflict: 'school_id,national_id' 
      });

      if (insertError) {
        throw new Error("حدث خطأ أثناء حفظ البيانات: " + insertError.message);
      }

      setStats({ inserted: studentsToInsert.length, deleted: deletedCount });
      setStatus("success");
      
      // Reload students table
      await loadStudents();
      
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "حدث خطأ غير متوقع أثناء المعالجة");
    } finally {
      setLoading(false);
    }
  };

  const getCertificatesCount = (student: any) => {
    return student.certificates?.length || 0;
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1000 }}>
      
      <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="heading-2" style={{ marginBottom: '0.5rem' }}>إدارة بيانات الطلاب</h1>
          <p className="text-muted">مزامنة بيانات نظام نور وإدارة سجلات الطلاب في المدرسة.</p>
        </div>
        
        <div className="glass-card flex-center" style={{ gap: '1rem', padding: '1rem 2rem', background: 'linear-gradient(135deg, var(--primary), #3b82f6)', color: 'white' }}>
          <Users size={32} />
          <div>
            <p style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: 600 }}>إجمالي الطلاب المسجلين</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1 }}>{pageLoading ? '...' : students.length}</p>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontWeight: 800, marginBottom: '1.5rem', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Upload size={20} className="text-primary" /> تحديث ومزامنة البيانات
        </h3>
        
        <div 
          style={{ 
            border: '2px dashed var(--secondary-foreground)', 
            borderRadius: 'var(--radius)', 
            padding: '2.5rem 2rem', 
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: file ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
            borderColor: file ? 'var(--primary)' : 'var(--secondary)'
          }}
          onClick={() => document.getElementById('excel-upload')?.click()}
        >
          <input 
            type="file" 
            id="excel-upload" 
            accept=".xlsx,.xls,.csv" 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
          />
          {file ? (
            <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
              <FileSpreadsheet size={48} style={{ color: 'var(--primary)' }} />
              <div>
                <p style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--primary)' }}>{file.name}</p>
                <p className="text-muted">{(file.size / 1024).toFixed(2)} KB - جاهز للاستيراد</p>
              </div>
            </div>
          ) : (
            <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1.25rem', background: 'var(--secondary)', borderRadius: '50%', color: 'var(--secondary-foreground)' }}>
                <Upload size={32} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.25rem' }}>انقر هنا لاختيار ملف إكسل من نظام نور</p>
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>صيغ مدعومة: XLSX, XLS (سيتم قراءة Sheet2 ومزامنة البيانات وتحديثها)</p>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> ملاحظة: التحديث سيقوم بإضافة الطلاب الجدد وحذف من لم يعد موجوداً في الملف.
          </p>
          <button 
            className="btn btn-primary" 
            disabled={!file || loading} 
            onClick={handleUpload}
            style={{ minWidth: 150, padding: '1rem 2rem', fontSize: '1.1rem', fontWeight: 700 }}
          >
            {loading ? <Loader2 className="animate-spin" /> : "بدء مزامنة البيانات"}
          </button>
        </div>
      </div>

      {status === "success" && (
        <div className="glass-card animate-fade-in" style={{ borderRight: '4px solid var(--accent)', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
          <CheckCircle size={28} style={{ color: 'var(--accent)' }} />
          <div>
            <h4 style={{ fontWeight: 800, color: 'var(--accent)', marginBottom: '0.25rem', fontSize: '1.1rem' }}>تمت المزامنة بنجاح!</h4>
            <p className="text-muted" style={{ fontWeight: 600 }}>تم تحديث {stats.inserted} طالب، وحذف {stats.deleted} طالب غير موجود في الملف الجديد.</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="glass-card animate-fade-in" style={{ borderRight: '4px solid var(--destructive)', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
          <AlertCircle size={28} style={{ color: 'var(--destructive)' }} />
          <div>
            <h4 style={{ fontWeight: 800, color: 'var(--destructive)', marginBottom: '0.25rem', fontSize: '1.1rem' }}>خطأ في المزامنة</h4>
            <p className="text-muted" style={{ fontWeight: 600 }}>{message}</p>
          </div>
        </div>
      )}

      {/* Persistent Students Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="flex-between" style={{ padding: '1.5rem', borderBottom: '1px solid var(--secondary)', background: 'rgba(255,255,255,0.5)' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} className="text-primary" /> قاعدة بيانات الطلاب الحالية
          </h3>
          <button onClick={loadStudents} disabled={pageLoading} className="btn" style={{ background: 'var(--secondary)', color: 'var(--foreground)', padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 600 }}>
            {pageLoading ? <Loader2 size={16} className="animate-spin" /> : 'تحديث القائمة'}
          </button>
        </div>
        
        <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead style={{ background: 'var(--secondary)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
              <tr>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>اسم الطالب</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>رقم الهوية / الطالب</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>الصف والفصل</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>حالة الشهادات</th>
              </tr>
            </thead>
            <tbody>
              {pageLoading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '4rem', textAlign: 'center' }}>
                    <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
                    <p className="text-muted" style={{ fontWeight: 600 }}>جاري تحميل البيانات...</p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '4rem', textAlign: 'center' }}>
                    <div style={{ background: 'var(--secondary)', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--muted)' }}>
                      <Users size={40} />
                    </div>
                    <h4 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.5rem' }}>لا يوجد طلاب مسجلين</h4>
                    <p className="text-muted">يرجى رفع ملف نظام نور في الأعلى لإضافة الطلاب.</p>
                  </td>
                </tr>
              ) : (
                students.map((student, i) => {
                  const certCount = getCertificatesCount(student);
                  return (
                    <tr key={student.id || i} style={{ borderBottom: '1px solid var(--secondary)', transition: 'background 0.2s' }} className="hover:bg-slate-50">
                      <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700 }}>{student.name}</td>
                      <td style={{ padding: '1.25rem 1.5rem', color: 'var(--primary)', fontWeight: 600, letterSpacing: '1px' }}>{student.national_id}</td>
                      <td style={{ padding: '1.25rem 1.5rem', color: 'var(--muted)', fontWeight: 600 }}>
                        {student.grade_level || 'غير محدد'} {student.classroom ? `/ ${student.classroom}` : ''}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        {certCount > 0 ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 700, fontSize: '0.9rem' }}>
                            <FileBadge size={18} /> لديه {certCount} شهادة
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--secondary)', color: 'var(--muted)', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 600, fontSize: '0.9rem' }}>
                            لا توجد شهادات
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
