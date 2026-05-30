"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Award, Trophy, Medal, Star } from "lucide-react";

export default function HonorsPage() {
  const [loading, setLoading] = useState(true);
  const [topStudents, setTopStudents] = useState<any[]>([]);

  useEffect(() => {
    async function loadHonors() {
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

        // Fetch top students based on rank_class or rank_grade
        // In a real scenario, we might want to group by grade or class
        // Here we fetch students who have a rank (1 to 10)
        const { data: certs } = await supabase
          .from('certificates')
          .select('id, rank_class, rank_grade, students(name, national_id, grade_level, classroom)')
          .eq('school_id', schoolId)
          .eq('status', 'MATCHED')
          .not('rank_grade', 'is', null)
          .order('rank_grade', { ascending: true })
          .limit(50);

        if (certs) {
          setTopStudents(certs.filter(c => c.rank_grade && c.rank_grade <= 10));
        }
      } catch (err) {
        console.error("Error loading honors:", err);
      } finally {
        setLoading(false);
      }
    }

    loadHonors();
  }, []);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '50vh' }}>
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  // Group by Grade Level
  const groupedByGrade = topStudents.reduce((acc: any, cert: any) => {
    const grade = cert.students?.grade_level || 'مرحلة غير محددة';
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(cert);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '1rem', borderRadius: '1rem', color: 'white' }}>
          <Trophy size={32} />
        </div>
        <div>
          <h1 className="heading-2">لوحة الشرف والمتفوقين</h1>
          <p className="text-muted mt-2">قائمة بأوائل الطلاب على مستوى المدرسة والمراحل الدراسية.</p>
        </div>
      </div>

      {Object.keys(groupedByGrade).length === 0 ? (
        <div className="glass-card flex-center flex-col p-12 text-center" style={{ border: '2px dashed var(--border)' }}>
          <Award size={64} className="text-muted mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">لا توجد بيانات للمتفوقين حتى الآن</h2>
          <p className="text-muted max-w-md">يرجى رفع الشهادات التي تحتوي على (ترتيب المرحلة) أو (ترتيب الفصل) لتظهر الأسماء هنا تلقائياً.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByGrade).map(([grade, certs]: [string, any]) => (
            <div key={grade} className="glass-card p-6 border-t-4" style={{ borderColor: '#f59e0b' }}>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Star className="text-amber-500" /> 
                {grade}
              </h2>
              
              <div className="grid-3">
                {certs.sort((a: any, b: any) => a.rank_grade - b.rank_grade).map((cert: any, index: number) => (
                  <div key={cert.id} className="relative bg-secondary/30 p-6 rounded-2xl border border-border hover:border-amber-500/50 transition-colors">
                    {index === 0 && (
                      <div className="absolute -top-4 -right-4 bg-amber-500 text-white w-12 h-12 rounded-full flex-center font-bold text-xl shadow-lg border-4 border-card">
                        1
                      </div>
                    )}
                    {index === 1 && (
                      <div className="absolute -top-4 -right-4 bg-slate-400 text-white w-12 h-12 rounded-full flex-center font-bold text-xl shadow-lg border-4 border-card">
                        2
                      </div>
                    )}
                    {index === 2 && (
                      <div className="absolute -top-4 -right-4 bg-amber-700 text-white w-12 h-12 rounded-full flex-center font-bold text-xl shadow-lg border-4 border-card">
                        3
                      </div>
                    )}
                    {(index > 2) && (
                      <div className="absolute -top-4 -right-4 bg-primary text-white w-12 h-12 rounded-full flex-center font-bold text-xl shadow-lg border-4 border-card">
                        {cert.rank_grade}
                      </div>
                    )}

                    <h3 className="text-lg font-bold mb-2 pr-4">{cert.students?.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <span className="bg-background px-3 py-1 rounded-full border border-border">
                        الفصل: {cert.students?.classroom || '-'}
                      </span>
                      {cert.rank_class && (
                        <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 font-bold">
                          ترتيب الفصل: {cert.rank_class}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
