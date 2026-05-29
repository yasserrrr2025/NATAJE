"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    matchedCertificates: 0,
    manualReview: 0
  });

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

        setStats({
          totalStudents: totalStudents || 0,
          matchedCertificates: matchedCertificates || 0,
          manualReview: manualReview || 0
        });

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

  return (
    <div className="animate-fade-in">
      <h1 className="heading-2" style={{ marginBottom: '2rem' }}>نظرة عامة على النظام</h1>
      
      <div className="grid-3" style={{ marginBottom: '3rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', borderBottom: '4px solid var(--primary)' }}>
          <p className="text-muted" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>إجمالي الطلاب المسجلين</p>
          <div className="flex-between">
            <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.totalStudents}</span>
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '1.5rem', borderBottom: '4px solid var(--accent)' }}>
          <p className="text-muted" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>الشهادات المطابقة</p>
          <div className="flex-between">
            <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.matchedCertificates}</span>
            {stats.totalStudents > 0 && (
              <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                {Math.round((stats.matchedCertificates / (stats.matchedCertificates + stats.manualReview || 1)) * 100)}% دقة
              </span>
            )}
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: '1.5rem', borderBottom: '4px solid var(--destructive)' }}>
          <p className="text-muted" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>قيد المراجعة اليدوية</p>
          <div className="flex-between">
            <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.manualReview}</span>
            {stats.manualReview > 0 && (
              <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--destructive)', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                يتطلب إجراء
              </span>
            )}
          </div>
        </div>
      </div>

      <h2 className="heading-2" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>تعليمات النظام</h2>
      <div className="glass-card" style={{ padding: '2rem' }}>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--foreground)', fontWeight: 600 }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ color: 'var(--primary)' }}>1.</span> قم برفع بيانات الطلاب من نظام نور في تبويب "بيانات الطلاب".</li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ color: 'var(--primary)' }}>2.</span> قم برفع ملفات PDF الخاصة بالشهادات في تبويب "معالجة الشهادات".</li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ color: 'var(--primary)' }}>3.</span> النظام سيقوم بالمطابقة التلقائية. يمكنك مراجعة الحالات غير المتطابقة في تبويب "المراجعة والمطابقة".</li>
        </ul>
      </div>
    </div>
  );
}
