"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Eye, EyeOff, AlertTriangle, Users } from "lucide-react";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    matchedCertificates: 0,
    manualReview: 0,
    viewedCertificates: 0,
  });
  const [unviewedList, setUnviewedList] = useState<any[]>([]);

  useEffect(() => {
    async function loadStats() {
      try {
        let schoolId = localStorage.getItem('school_id');
        
        if (!schoolId) {
          const { data: schools } = await supabase.from('schools').select('id').limit(1);
          schoolId = schools?.[0]?.id;
        }

        if (!schoolId) {
          setLoading(false);
          return;
        }

        // Fetch Total Students
        const { count: totalStudents } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId);

        // Fetch Matched Certificates
        const { count: matchedCertificates } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'MATCHED');

        // Fetch Manual Review Certificates
        const { count: manualReview } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'MANUAL_REVIEW_NEEDED');

        // Fetch Analytics (Viewed vs Unviewed)
        const { data: certs } = await supabase
          .from('certificates')
          .select('id, viewed_at, student_id, students(name, national_id, grade_level, classroom)')
          .eq('school_id', schoolId)
          .eq('status', 'MATCHED');

        let viewedCount = 0;
        let unviewedArray: any[] = [];

        if (certs) {
          certs.forEach(cert => {
            if (cert.viewed_at) {
              viewedCount++;
            } else if (cert.students) {
              unviewedArray.push(cert);
            }
          });
        }

        setStats({
          totalStudents: totalStudents || 0,
          matchedCertificates: matchedCertificates || 0,
          manualReview: manualReview || 0,
          viewedCertificates: viewedCount
        });
        
        setUnviewedList(unviewedArray);

      } catch (err) {
        console.error("Error loading stats:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '50vh' }}>
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  const viewPercentage = stats.matchedCertificates > 0 ? Math.round((stats.viewedCertificates / stats.matchedCertificates) * 100) : 0;

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="heading-2">نظرة عامة والتحليلات</h1>
        <p className="text-muted mt-2">إحصائيات شاملة لحالة الشهادات ومتابعة أولياء الأمور.</p>
      </div>
      
      <div className="grid-4">
        <div className="glass-card" style={{ padding: '1.5rem', borderBottom: '4px solid var(--primary)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--primary)' }}><Users size={20} /></div>
            <p className="text-muted" style={{ fontWeight: 600 }}>إجمالي الطلاب المسجلين</p>
          </div>
          <div className="flex-between">
            <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.totalStudents}</span>
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '1.5rem', borderBottom: '4px solid var(--accent)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--accent)' }}><Loader2 size={20} /></div>
            <p className="text-muted" style={{ fontWeight: 600 }}>الشهادات الجاهزة</p>
          </div>
          <div className="flex-between">
            <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.matchedCertificates}</span>
            {stats.totalStudents > 0 && (
              <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                {Math.round((stats.matchedCertificates / (stats.totalStudents || 1)) * 100)}% تغطية
              </span>
            )}
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '1.5rem', borderBottom: '4px solid var(--destructive)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '0.5rem', color: 'var(--destructive)' }}><AlertTriangle size={20} /></div>
            <p className="text-muted" style={{ fontWeight: 600 }}>تحتاج مراجعة</p>
          </div>
          <div className="flex-between">
            <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.manualReview}</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderBottom: '4px solid #8b5cf6' }}>
          <div className="flex items-center gap-3 mb-2">
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.5rem', borderRadius: '0.5rem', color: '#8b5cf6' }}><Eye size={20} /></div>
            <p className="text-muted" style={{ fontWeight: 600 }}>الشهادات المقروءة</p>
          </div>
          <div className="flex-between">
            <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.viewedCertificates}</span>
            <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
              {viewPercentage}% نسبة القراءة
            </span>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 mt-8">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '1rem', color: 'var(--destructive)' }}>
            <EyeOff size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>طلاب لم يستلموا شهاداتهم ({unviewedList.length})</h2>
            <p className="text-muted text-sm">قائمة بالطلاب الذين أُصدرت لهم شهادات ولكن لم يقم ولي الأمر بالاستعلام عنها حتى الآن.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="p-4 font-bold rounded-tr-lg">اسم الطالب</th>
                <th className="p-4 font-bold">رقم الهوية</th>
                <th className="p-4 font-bold">الصف والفصل</th>
              </tr>
            </thead>
            <tbody>
              {unviewedList.map(cert => (
                <tr key={cert.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                  <td className="p-4 font-medium">{cert.students?.name}</td>
                  <td className="p-4 text-muted">{cert.students?.national_id}</td>
                  <td className="p-4 text-muted">
                    {cert.students?.grade_level || '-'} / {cert.students?.classroom || '-'}
                  </td>
                </tr>
              ))}
              {unviewedList.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-muted">
                    عمل ممتاز! جميع الطلاب استلموا شهاداتهم.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
