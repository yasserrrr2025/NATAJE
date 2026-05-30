"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Award, Trophy, Star } from "lucide-react";

export default function HonorsPage() {
  const [loading, setLoading] = useState(true);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'grade' | 'class'>('grade');

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

        // Fetch students who have either a rank_grade or rank_class
        const { data: certs } = await supabase
          .from('certificates')
          .select('id, rank_class, rank_grade, students(name, national_id, grade_level, classroom)')
          .eq('school_id', schoolId)
          .eq('status', 'MATCHED')
          .or('rank_grade.not.is.null,rank_class.not.is.null')
          .limit(500); // Fetch more to allow proper grouping

        if (certs) {
          setTopStudents(certs);
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

  // Group by Grade Level (المراحل)
  const groupedByGrade = topStudents
    .filter(c => c.rank_grade && c.rank_grade <= 15) // Only top 15 per grade
    .reduce((acc: any, cert: any) => {
      const grade = cert.students?.grade_level || 'مرحلة غير محددة';
      if (!acc[grade]) acc[grade] = [];
      acc[grade].push(cert);
      return acc;
    }, {});

  // Group by Classroom (الفصول)
  const groupedByClass = topStudents
    .filter(c => c.rank_class && c.rank_class <= 10) // Only top 10 per class
    .reduce((acc: any, cert: any) => {
      // Group by Grade AND Class for clarity
      const grade = cert.students?.grade_level || 'مرحلة غير محددة';
      const classroom = cert.students?.classroom || 'فصل غير محدد';
      const groupKey = `${grade} - الفصل ${classroom}`;
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(cert);
      return acc;
    }, {});

  const currentGroups = activeTab === 'grade' ? groupedByGrade : groupedByClass;

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '1rem', borderRadius: '1rem', color: 'white' }}>
          <Trophy size={32} />
        </div>
        <div>
          <h1 className="heading-2">لوحة الشرف والمتفوقين</h1>
          <p className="text-muted mt-2">قائمة بأوائل الطلاب على مستوى المدرسة والمراحل والفصول الدراسية.</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-secondary/50 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('grade')}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'grade' ? 'bg-background shadow-sm text-primary' : 'text-muted hover:text-foreground'}`}
        >
          أوائل المراحل (الصفوف)
        </button>
        <button 
          onClick={() => setActiveTab('class')}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'class' ? 'bg-background shadow-sm text-primary' : 'text-muted hover:text-foreground'}`}
        >
          أوائل الفصول
        </button>
      </div>

      {Object.keys(currentGroups).length === 0 ? (
        <div className="glass-card flex-center flex-col p-12 text-center" style={{ border: '2px dashed var(--border)' }}>
          <Award size={64} className="text-muted mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">لا توجد بيانات للمتفوقين حتى الآن</h2>
          <p className="text-muted max-w-md">يرجى رفع الشهادات التي تحتوي على (ترتيب المرحلة) أو (ترتيب الفصل) لتظهر الأسماء هنا تلقائياً.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(currentGroups).map(([groupName, certs]: [string, any]) => (
            <div key={groupName} className="glass-card p-6 border-t-4" style={{ borderColor: '#f59e0b' }}>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Star className="text-amber-500" /> 
                {groupName}
              </h2>
              
              <div className="grid-3">
                {certs.sort((a: any, b: any) => (activeTab === 'grade' ? a.rank_grade - b.rank_grade : a.rank_class - b.rank_class)).map((cert: any, index: number) => {
                  const rank = activeTab === 'grade' ? cert.rank_grade : cert.rank_class;
                  return (
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
                          {rank}
                        </div>
                      )}

                      <h3 className="text-lg font-bold mb-2 pr-4">{cert.students?.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted mt-4">
                        <span className="bg-background px-3 py-1 rounded-full border border-border">
                          الفصل: {cert.students?.classroom || '-'}
                        </span>
                        {activeTab === 'class' && cert.rank_grade && (
                          <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 font-bold text-xs">
                            ترتيب المرحلة: {cert.rank_grade}
                          </span>
                        )}
                        {activeTab === 'grade' && cert.rank_class && (
                          <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 font-bold text-xs">
                            ترتيب الفصل: {cert.rank_class}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
