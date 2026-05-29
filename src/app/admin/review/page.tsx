"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Check, Search, Eye, FileText, Loader2, UserCheck, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentSchoolId } from "@/lib/school-session";

export default function ReviewPage() {
  const [unmatched, setUnmatched] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  
  // States for manual mapping per certificate
  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({});
  const [foundStudents, setFoundStudents] = useState<Record<string, any>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadUnmatched();
  }, []);

  const loadUnmatched = async () => {
    setLoading(true);
    try {
      const currentSchoolId = getCurrentSchoolId();
      if (currentSchoolId) {
        setSchoolId(currentSchoolId);
        
        const { data: certs } = await supabase
          .from('certificates')
          .select('*')
          .eq('school_id', currentSchoolId)
          .neq('status', 'MATCHED')
          .order('created_at', { ascending: false });
          
        setUnmatched(certs || []);
      }
    } catch (error) {
      console.error("Error loading unmatched certificates", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (certId: string, value: string) => {
    // Allow numbers and dashes
    const cleanValue = value.replace(/[^0-9-]/g, '');
    setSearchInputs(prev => ({ ...prev, [certId]: cleanValue }));
    // Clear found student if input changes
    if (foundStudents[certId]) {
      const updated = { ...foundStudents };
      delete updated[certId];
      setFoundStudents(updated);
    }
  };

  const handleSearchStudent = async (certId: string) => {
    const nationalId = searchInputs[certId];
    if (!nationalId || nationalId.length < 10) return;
    
    setProcessing(prev => ({ ...prev, [certId]: true }));
    
    try {
      const { data: student } = await supabase
        .from('students')
        .select('id, name, grade_level, classroom')
        .eq('school_id', schoolId)
        .eq('national_id', nationalId)
        .maybeSingle();
        
      if (student) {
        setFoundStudents(prev => ({ ...prev, [certId]: student }));
      } else {
        setFoundStudents(prev => ({ ...prev, [certId]: null }));
        alert("لم يتم العثور على طالب بهذا الرقم في قاعدة البيانات. تأكد من رفعه مسبقاً.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(prev => ({ ...prev, [certId]: false }));
    }
  };

  const handleConfirmMatch = async (certId: string) => {
    const student = foundStudents[certId];
    if (!student) return;
    
    setProcessing(prev => ({ ...prev, [certId]: true }));
    
    try {
      const { error } = await supabase
        .from('certificates')
        .update({ student_id: student.id, status: 'MATCHED' })
        .eq('id', certId);
        
      if (!error) {
        // Remove from list automatically
        setUnmatched(prev => prev.filter(c => c.id !== certId));
      } else {
        alert("حدث خطأ أثناء ربط الشهادة بالطالب.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(prev => ({ ...prev, [certId]: false }));
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="heading-2" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            المراجعة والمطابقة اليدوية
          </h1>
          <p className="text-muted" style={{ fontSize: '1.1rem' }}>
            الشهادات التي لم يتمكن الذكاء الاصطناعي من قراءتها آلياً وبحاجة لربط يدوي.
          </p>
        </div>
        <div style={{ background: unmatched.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: unmatched.length > 0 ? 'var(--destructive)' : 'var(--accent)', padding: '0.75rem 1.5rem', borderRadius: '2rem', fontWeight: 700, display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '1.1rem', border: `1px solid ${unmatched.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}` }}>
          {unmatched.length > 0 ? <AlertTriangle size={24} /> : <Check size={24} />}
          {loading ? 'جاري التحميل...' : `${unmatched.length} ملفات بانتظار المراجعة`}
        </div>
      </div>

      {loading ? (
        <div className="flex-center" style={{ minHeight: '40vh', flexDirection: 'column', gap: '1rem' }}>
          <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary)' }} />
          <p className="text-muted" style={{ fontWeight: 600 }}>جاري استخراج الملفات غير المطابقة...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {unmatched.length === 0 ? (
            <div className="glass-card flex-center animate-fade-in" style={{ padding: '6rem 2rem', flexDirection: 'column', gap: '1.5rem', color: 'var(--accent)', textAlign: 'center', border: '2px dashed rgba(16, 185, 129, 0.3)' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '2rem', borderRadius: '50%' }}>
                <Check size={64} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 style={{ fontSize: '2rem', fontWeight: 800 }}>جميع الملفات مطابقة!</h3>
              <p className="text-muted" style={{ fontSize: '1.25rem' }}>لا توجد أي شهادات معلقة للمراجعة اليدوية حالياً، كل شيء يعمل بكفاءة.</p>
            </div>
          ) : (
            unmatched.map((item, index) => (
              <div key={item.id} className="glass-card animate-fade-in" style={{ display: 'flex', gap: '0', borderRight: '6px solid #f59e0b', padding: 0, overflow: 'hidden', animationDelay: `${index * 0.1}s` }}>
                
                {/* Right Side: PDF Preview */}
                <div style={{ width: '350px', background: 'var(--secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                  <div style={{ background: 'var(--background)', padding: '2rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', width: '100%', height: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                    <FileText size={64} style={{ color: 'var(--secondary-foreground)', opacity: 0.5 }} />
                    <p style={{ fontWeight: 700, color: 'var(--secondary-foreground)', textAlign: 'center' }}>الشهادة المجهولة</p>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => window.open(item.file_url || '#', '_blank')}
                      style={{ width: '100%' }}
                      disabled={!item.file_url}
                    >
                      <Eye size={18} /> معاينة المستند (PDF)
                    </button>
                  </div>
                </div>

                {/* Left Side: Data and Action */}
                <div style={{ flex: 1, padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderRadius: '1rem', fontSize: '0.9rem', fontWeight: 700 }}>
                      غير مطابق (Unmatched)
                    </span>
                    <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                      تم الرفع في: {new Date(item.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>إصلاح وربط الشهادة</h3>

                  <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--secondary)' }}>
                    <label className="label" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>رقم الهوية الصحيح للطالب</label>
                    
                    {!foundStudents[item.id] ? (
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input 
                            type="text" 
                            className="input" 
                            placeholder="أدخل رقم الهوية (مع أو بدون شرطة)..." 
                            maxLength={15}
                            value={searchInputs[item.id] || ""}
                            onChange={(e) => handleInputChange(item.id, e.target.value)}
                            style={{ fontSize: '1.1rem', letterSpacing: '2px', padding: '1rem' }}
                            disabled={processing[item.id]}
                          />
                        </div>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleSearchStudent(item.id)}
                          disabled={processing[item.id] || (searchInputs[item.id]?.length || 0) < 10}
                          style={{ padding: '0 2rem' }}
                        >
                          {processing[item.id] ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                          بحث
                        </button>
                      </div>
                    ) : (
                      <div className="animate-fade-in" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--accent)', padding: '1rem 1.5rem', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ background: 'var(--accent)', color: 'white', padding: '0.75rem', borderRadius: '50%' }}>
                            <UserCheck size={24} />
                          </div>
                          <div>
                            <h4 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--foreground)' }}>{foundStudents[item.id].name}</h4>
                            <p className="text-muted" style={{ fontWeight: 600 }}>{foundStudents[item.id].grade_level} {foundStudents[item.id].classroom ? `- ${foundStudents[item.id].classroom}` : ''}</p>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button 
                            className="btn" 
                            onClick={() => handleInputChange(item.id, searchInputs[item.id])} // Resets the found state
                            style={{ background: 'var(--background)', color: 'var(--destructive)', border: '1px solid var(--destructive)' }}
                            disabled={processing[item.id]}
                          >
                            <X size={20} /> إلغاء
                          </button>
                          <button 
                            className="btn btn-primary" 
                            onClick={() => handleConfirmMatch(item.id)}
                            disabled={processing[item.id]}
                          >
                            {processing[item.id] ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                            اعتماد وربط
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
