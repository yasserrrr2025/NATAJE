"use client";

import { useState, use, useEffect } from "react";
import { Search, FileText, Download, Building, Loader2, AlertCircle, ShieldCheck, CheckCircle2, Share2, Printer } from "lucide-react";
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';

export default function SchoolPortalPage({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const resolvedParams = use(params);
  const { schoolSlug } = resolvedParams;
  
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [school, setSchool] = useState<{ id: string, name: string, is_portal_active: boolean, logo_url: string | null, is_active?: boolean, subscription_end_date?: string } | null>(null);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [result, setResult] = useState<null | { found: boolean, student?: any, certificates?: any[] }>(null);

  useEffect(() => {
    async function loadSchool() {
      const { data } = await supabase
        .from('schools')
        .select('id, name, is_portal_active, logo_url, is_active, subscription_end_date')
        .eq('slug', schoolSlug)
        .maybeSingle();
        
      setSchool(data);
      setSchoolLoading(false);
    }
    loadSchool();
  }, [schoolSlug]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationalId || nationalId.length < 10 || !school) return;
    
    setLoading(true);
    setResult(null);

    try {
      const { data: student } = await supabase
        .from('students')
        .select('id, name, grade_level, classroom')
        .eq('school_id', school.id)
        .eq('national_id', nationalId)
        .maybeSingle();

      if (!student) {
        setResult({ found: false });
        return;
      }

      const { data: certificates } = await supabase
        .from('certificates')
        .select('*')
        .eq('student_id', student.id)
        .eq('status', 'MATCHED');

      if (certificates && certificates.length > 0) {
        // Track the view! (Analytics)
        const certIds = certificates.map(c => c.id);
        const { error: updateError } = await supabase
          .from('certificates')
          .update({ viewed_at: new Date().toISOString() })
          .in('id', certIds)
          .is('viewed_at', null);
        
        if (updateError) console.error("Analytics error:", updateError);

        // Celebrate!
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#10b981', '#fcd34d']
        });
      }

      setResult({
        found: true,
        student,
        certificates: certificates || []
      });

    } catch (err) {
      console.error(err);
      setResult({ found: false });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (certUrl: string) => {
    const text = encodeURIComponent(`أهلاً بك، يمكنك تحميل شهادتي المدرسية من الرابط التالي:\n${certUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handlePrint = (certUrl: string) => {
    const printWindow = window.open(certUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  if (schoolLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1.5rem', background: '#0f172a' }}>
        <Loader2 className="animate-spin" size={64} style={{ color: '#38bdf8' }} />
        <p style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.25rem', letterSpacing: '1px' }}>جاري تهيئة البوابة الآمنة...</p>
      </div>
    );
  }

  if (!school || !school.is_portal_active) {
    return (
      <div className="flex-center animate-fade-in" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem', background: '#0f172a' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '2rem', borderRadius: '50%', boxShadow: '0 0 40px rgba(239,68,68,0.2)' }}>
          <AlertCircle size={80} style={{ color: '#ef4444' }} />
        </div>
        <h1 style={{ color: '#f8fafc', margin: '1rem 0 0', fontSize: '2.5rem', fontWeight: 900 }}>البوابة غير متاحة</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.25rem', maxWidth: 400, textAlign: 'center' }}>نعتذر، بوابة الاستعلام لهذه المدرسة غير متاحة حالياً أو الرابط غير صحيح.</p>
      </div>
    );
  }

  // Check if school is completely deactivated by Super Admin
  if (school.is_active === false) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: '#0f172a' }}>
        <div className="float-slow" style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(20px)', padding: '4rem 5rem', borderRadius: '2.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <ShieldCheck size={64} style={{ color: '#ef4444', margin: '0 auto 1.5rem', opacity: 0.8 }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: 0, lineHeight: 1.6 }}>نعتذر، البوابة متوقفة مؤقتاً بقرار من الإدارة.</h1>
        </div>
      </div>
    );
  }

  // Check if subscription is expired
  if (school.subscription_end_date && new Date(school.subscription_end_date) < new Date()) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: '#0f172a', position: 'relative', overflow: 'hidden' }}>
        <div className="float-slow" style={{ position: 'absolute', top: '20%', left: '15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div className="float-fast" style={{ position: 'absolute', bottom: '15%', right: '15%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
        
        <div className="float-medium" style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(30px)', padding: '4rem 5rem', borderRadius: '2.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', zIndex: 10, maxWidth: '90%' }}>
          <div style={{ background: 'rgba(239,68,68,0.1)', width: 100, height: 100, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
            <AlertCircle size={50} style={{ color: '#ef4444' }} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#f8fafc', margin: 0, lineHeight: 1.6 }}>
            نعتذر، البوابة متوقفة مؤقتاً بسبب<br/>انتهاء اشتراك المدرسة في المنصة.
          </h1>
        </div>
        <style>{`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
            100% { transform: translateY(0px); }
          }
          @keyframes float-fast {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-25px); }
            100% { transform: translateY(0px); }
          }
          .float-slow { animation: float 6s ease-in-out infinite; }
          .float-medium { animation: float 4s ease-in-out infinite; }
          .float-fast { animation: float-fast 3s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '3rem 1rem',
      position: 'relative',
      overflow: 'hidden',
      background: '#0a0f1c' // Deep premium dark blue
    }}>
      {/* Animated Mesh Gradient Background */}
      <div className="mesh-gradient" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6, zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at center, transparent 0%, #0a0f1c 100%)', zIndex: 1 }} />
      
      {/* Dynamic Ministry Logo Floating at Top Right */}
      <div className="float-medium" style={{ position: 'absolute', top: '2.5rem', right: '2.5rem', zIndex: 20, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(20px)', padding: '1rem 1.5rem', borderRadius: '1.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <img 
          src="https://upload.wikimedia.org/wikipedia/ar/1/17/Saudi_Ministry_of_Education_Logo_2025.png" 
          alt="وزارة التعليم" 
          style={{ height: 50, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2)) brightness(0) invert(1)' }} 
        />
      </div>

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 700, position: 'relative', zIndex: 10 }}>
        
        {/* Floating School Identity */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="float-slow school-badge" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '2.5rem', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)', marginBottom: '2.5rem' }}>
            {school.logo_url ? (
              <div style={{ background: 'white', padding: '1rem', borderRadius: '50%', boxShadow: '0 0 30px rgba(255,255,255,0.1)' }}>
                <img src={school.logo_url} alt={school.name} style={{ height: 75, objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ background: 'linear-gradient(135deg, #38bdf8, #2563eb)', color: 'white', padding: '1.5rem', borderRadius: '50%', boxShadow: '0 15px 30px rgba(37,99,235,0.4)' }}>
                <Building size={40} />
              </div>
            )}
            <h2 className="school-name" style={{ fontWeight: 900, margin: 0, color: '#f8fafc', letterSpacing: '-0.5px' }}>{school.name}</h2>
          </div>
          
          <h1 className="portal-title" style={{ marginBottom: '1rem', fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>بوابة الاستعلام</h1>
          <p className="portal-subtitle" style={{ maxWidth: 550, margin: '0 auto', lineHeight: 1.6, color: '#cbd5e1' }}>
            للحصول على شهاداتك المدرسية المعتمدة فوراً، أدخل رقم الهوية الوطنية الخاص بك في الأسفل.
          </p>
        </div>

        {/* Premium Search Box */}
        <div className="search-box-container" style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(30px)', borderRadius: '2.5rem', boxShadow: '0 30px 60px -15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)' }} />
          
          <form onSubmit={handleSearch} className="search-form" style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 2 }}>
            <div>
              <label htmlFor="nationalId" style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'block', color: '#f8fafc' }}>رقم الهوية الوطنية</label>
              <div style={{ position: 'relative' }} className="search-input-wrapper">
                <input 
                  id="nationalId"
                  type="text" 
                  className="portal-input"
                  placeholder="أدخل رقم الهوية للبحث..." 
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/[^0-9-]/g, ''))}
                  maxLength={15}
                  style={{ 
                    width: '100%',
                    paddingRight: '4rem', 
                    borderRadius: '1.5rem',
                    textAlign: 'center',
                    fontWeight: 900,
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '2px solid rgba(255,255,255,0.1)',
                    color: '#f8fafc',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#38bdf8';
                    e.target.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.3), inset 0 2px 10px rgba(0,0,0,0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.target.style.boxShadow = 'inset 0 2px 10px rgba(0,0,0,0.5)';
                  }}
                />
                <div className="search-icon-container" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(56,189,248,0.1)', padding: '0.75rem', borderRadius: '1rem' }}>
                  <Search className="search-icon" style={{ color: '#38bdf8' }} />
                </div>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="premium-btn"
              disabled={loading || nationalId.length < 10}
              style={{ 
                width: '100%', 
                fontWeight: 900,
                borderRadius: '1.5rem',
                background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
                color: 'white',
                border: 'none',
                cursor: (loading || nationalId.length < 10) ? 'not-allowed' : 'pointer',
                opacity: (loading || nationalId.length < 10) ? 0.5 : 1,
                boxShadow: (loading || nationalId.length < 10) ? 'none' : '0 15px 35px rgba(37,99,235,0.4)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {loading ? <Loader2 size={32} className="animate-spin" /> : (
                <>
                  <ShieldCheck className="btn-icon" />
                  عرض الشهادة المعتمدة
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Section */}
        {result && (
          <div className="animate-slide-up" style={{ marginTop: '3rem' }}>
            {result.found && result.student ? (
              <div style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(30px)', borderTop: '6px solid #10b981', padding: '3.5rem', borderRadius: '2.5rem', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                
                <div className="flex-between" style={{ marginBottom: '3rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '1rem', color: '#f8fafc', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{result.student.name}</h3>
                    <div style={{ display: 'flex', gap: '1rem', color: '#cbd5e1', fontWeight: 700, fontSize: '1.15rem' }}>
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {result.student.grade_level ? `الصف: ${result.student.grade_level}` : 'الصف غير محدد'}
                      </span>
                      {result.student.classroom && (
                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                          الفصل: {result.student.classroom}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="glow-badge" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '1rem 2rem', borderRadius: '2rem', fontWeight: 900, fontSize: '1.25rem', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={24} /> طالب معتمد
                  </div>
                </div>
                
                <div style={{ marginTop: '2.5rem' }}>
                  <h4 style={{ fontWeight: 800, marginBottom: '2rem', fontSize: '1.5rem', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                    الشهادات المتاحة لك ({result.certificates?.length || 0})
                  </h4>
                  
                  {result.certificates && result.certificates.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {result.certificates.map((cert, index) => (
                        <div key={cert.id || index} className="cert-card cert-card-content" style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default' }}>
                          <div className="flex-center cert-card-info" style={{ gap: '1.5rem' }}>
                            <div className="cert-icon-box" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05))', borderRadius: '1.25rem', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FileText className="cert-icon" style={{ color: '#ef4444' }} />
                            </div>
                            <div>
                              <h4 style={{ fontWeight: 900, fontSize: '1.35rem', marginBottom: '0.5rem', color: '#f8fafc' }}>{cert.term ? cert.term : `شهادة ${cert.academic_year || 'مدرسية'}`}</h4>
                              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ShieldCheck size={18} /> مصادقة إلكترونية من النظام
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => handlePrint(cert.file_url || '#')}
                              disabled={!cert.file_url}
                              className="action-btn"
                              style={{ padding: '0.75rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.05)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s' }}
                              title="طباعة الشهادة"
                            >
                              <Printer size={20} />
                            </button>
                            <button 
                              onClick={() => handleShare(cert.file_url || '#')}
                              disabled={!cert.file_url}
                              className="action-btn"
                              style={{ padding: '0.75rem', borderRadius: '1rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer', transition: 'all 0.2s' }}
                              title="مشاركة عبر الواتساب"
                            >
                              <Share2 size={20} />
                            </button>
                            <button 
                              onClick={() => window.open(cert.file_url || '#', '_blank')}
                              disabled={!cert.file_url}
                              className="download-btn"
                              style={{ 
                                padding: '0.75rem 1.5rem', 
                                borderRadius: '1rem',
                                background: 'white',
                                color: '#0f172a',
                                border: 'none',
                                fontWeight: 800,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 5px 15px rgba(255,255,255,0.1)',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              <Download size={20} /> تحميل
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '5rem 2rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '2rem', border: '2px dashed rgba(255,255,255,0.1)' }}>
                      <FileText size={80} style={{ color: '#475569', margin: '0 auto 2rem' }} />
                      <h4 style={{ fontWeight: 900, marginBottom: '1rem', fontSize: '1.75rem', color: '#f8fafc' }}>لا توجد شهادات حالياً</h4>
                      <p style={{ color: '#94a3b8', fontSize: '1.25rem' }}>لم يتم إدراج شهاداتك بعد، يرجى المحاولة لاحقاً أو مراجعة إدارة مدرستك.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '5rem 3rem', background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(20px)', borderRadius: '2.5rem', borderTop: '6px solid #ef4444', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239,68,68,0.05))', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 10px 30px rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={60} />
                </div>
                <h3 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '1.5rem', color: '#f8fafc' }}>الطالب غير مسجل لدينا</h3>
                <p style={{ fontSize: '1.35rem', maxWidth: 500, margin: '0 auto', color: '#94a3b8', lineHeight: 1.6 }}>
                  تأكد من رقم الهوية المدخل، إذا استمرت المشكلة يرجى مراجعة الإدارة المدرسية للمطابقة والتأكد من البيانات.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        /* Deep Mesh Gradient Animation */
        .mesh-gradient {
          background-color: #0a0f1c;
          background-image: 
            radial-gradient(at 80% 0%, rgba(37, 99, 235, 0.15) 0px, transparent 50%),
            radial-gradient(at 0% 50%, rgba(16, 185, 129, 0.1) 0px, transparent 50%),
            radial-gradient(at 80% 100%, rgba(139, 92, 246, 0.15) 0px, transparent 50%),
            radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.1) 0px, transparent 50%);
          background-size: 200% 200%;
          animation: meshMove 15s ease infinite alternate;
        }

        @keyframes meshMove {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }

        /* Float Animations */
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(1deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        
        @keyframes float-fast {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(-2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        
        .float-slow { animation: float 6s ease-in-out infinite; }
        .float-medium { animation: float 4s ease-in-out infinite; }
        .float-fast { animation: float-fast 3s ease-in-out infinite; }

        /* Slide Up Animation */
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Premium Buttons */
        .premium-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(37,99,235,0.6);
          filter: brightness(1.1);
        }
        .premium-btn:active:not(:disabled) {
          transform: translateY(1px);
        }

        .cert-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255,255,255,0.2) !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          background: rgba(30, 41, 59, 0.8) !important;
        }

        .download-btn:hover:not(:disabled) {
          background: #f8fafc;
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(255,255,255,0.2);
        }

        .glow-badge {
          animation: badgePulse 2s infinite;
        }

        @keyframes badgePulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        /* Responsive Styles */
        .school-badge {
          padding: 2.5rem 4rem;
        }
        .school-name {
          font-size: 2rem;
        }
        .portal-title {
          font-size: 4rem;
        }
        .portal-subtitle {
          font-size: 1.25rem;
        }
        .search-box-container {
          padding: 3.5rem;
        }
        .search-form {
          gap: 2.5rem;
        }
        .portal-input {
          padding: 1.5rem 2rem;
          font-size: 1.75rem;
          letter-spacing: 5px;
        }
        .search-icon {
          width: 28px;
          height: 28px;
        }
        .premium-btn {
          padding: 1.5rem;
          font-size: 1.5rem;
          gap: 1rem;
        }
        .btn-icon {
          width: 28px;
          height: 28px;
        }
        .cert-card-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .cert-icon-box {
          padding: 1.5rem;
        }
        .cert-icon {
          width: 36px;
          height: 36px;
        }

        @media (max-width: 640px) {
          .school-badge {
            padding: 1.5rem 2rem;
            margin-bottom: 1.5rem;
          }
          .school-name {
            font-size: 1.5rem;
          }
          .portal-title {
            font-size: 2.5rem;
          }
          .portal-subtitle {
            font-size: 1rem;
            padding: 0 1rem;
          }
          .search-box-container {
            padding: 2rem 1.5rem;
            border-radius: 1.5rem;
          }
          .search-form {
            gap: 1.5rem;
          }
          .portal-input {
            padding: 1rem 1rem;
            padding-right: 3.5rem !important;
            font-size: 1.25rem !important;
            letter-spacing: 2px !important;
            border-radius: 1rem !important;
          }
          .portal-input::placeholder {
            font-size: 0.95rem;
            letter-spacing: normal;
          }
          .search-icon-container {
            right: 0.5rem !important;
            padding: 0.5rem !important;
          }
          .search-icon {
            width: 20px;
            height: 20px;
          }
          .premium-btn {
            padding: 1rem !important;
            font-size: 1.15rem !important;
            border-radius: 1rem !important;
            gap: 0.5rem !important;
          }
          .btn-icon {
            width: 22px;
            height: 22px;
          }
          .cert-card-content {
            flex-direction: column;
            gap: 1.5rem;
            text-align: center;
            padding: 1.5rem !important;
          }
          .cert-card-info {
            flex-direction: column;
            gap: 1rem !important;
          }
          .cert-icon-box {
            padding: 1rem !important;
          }
          .cert-icon {
            width: 28px;
            height: 28px;
          }
          .download-btn {
            width: 100%;
            justify-content: center;
            padding: 1rem !important;
            font-size: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
