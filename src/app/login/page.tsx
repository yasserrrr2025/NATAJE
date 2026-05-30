"use client";

import { useState } from "react";
import { Lock, Mail, ArrowRight, Loader2, ShieldCheck, FileText, AlertCircle, Copy, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [ministerialNumber, setMinisterialNumber] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isResetMode) {
        await handlePasswordRecovery();
        return;
      }

      const school = await signInSchool(email, password);

      if (!school) {
        throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      }

      if (school.is_active === false) {
        throw new Error("حساب مدرستك موقوف، يرجى التواصل مع الإدارة.");
      }

      // Store school ID in localStorage for simple auth simulation
      if (typeof window !== 'undefined') {
        localStorage.setItem('school_id', school.id);
        localStorage.setItem('school_name', school.name);
      }

      router.push('/admin');
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء الاتصال بالخادم.");
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async () => {
    setTemporaryPassword("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanMinisterialNumber = ministerialNumber.trim();

    if (!cleanEmail || !cleanMinisterialNumber) {
      throw new Error("أدخل البريد الإلكتروني والرقم الوزاري لاستعادة الوصول.");
    }

    const nextPassword = generateTemporaryPassword();
    const { data, error: resetError } = await supabase.rpc("request_school_password_reset", {
      input_email: cleanEmail,
      input_ministerial_number: cleanMinisterialNumber,
      input_new_password: nextPassword,
    });

    if (resetError) throw resetError;

    const school = Array.isArray(data) ? data[0] : null;

    if (!school) {
      throw new Error("لم نجد مدرسة بهذه البيانات. تأكد من البريد الإلكتروني والرقم الوزاري.");
    }

    if (school.is_active === false) {
      throw new Error("حساب المدرسة موقوف حالياً. يرجى التواصل مع الإدارة المركزية.");
    }

    setPassword("");
    setTemporaryPassword(nextPassword);
    setError("تم إنشاء كلمة مرور مؤقتة جديدة. انسخها وسجل الدخول بها الآن.");
    setLoading(false);
  };

  const copyTemporaryPassword = async () => {
    if (!temporaryPassword) return;
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0f172a' }}>
      {/* Left Column - Branding and Features (Hidden on mobile) */}
      <div style={{ flex: 1, display: 'none', flexDirection: 'column', padding: '4rem', background: 'linear-gradient(135deg, #1e293b, #0f172a)', position: 'relative', overflow: 'hidden' }} className="desktop-only">
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(37, 99, 235, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)', zIndex: 0 }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '4rem' }}>
            <img src="https://upload.wikimedia.org/wikipedia/ar/1/17/Saudi_Ministry_of_Education_Logo_2025.png" alt="وزارة التعليم" style={{ height: 50, filter: 'brightness(0) invert(1)' }} />
            <h2 style={{ color: 'white', fontWeight: 900, margin: 0, fontSize: '1.75rem' }}>منصة شهاداتي</h2>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ color: 'white', fontSize: '3.5rem', fontWeight: 900, lineHeight: 1.2, marginBottom: '2rem' }}>
              المنصة الإدارية<br/>
              <span style={{ color: '#38bdf8' }}>الأذكى للمدارس</span>
            </h1>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '1rem', borderRadius: '1rem', color: '#38bdf8' }}>
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h3 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>أمان وتشفير عالي</h3>
                  <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>بيانات طلابك مشفرة ومحفوظة في خوادم سحابية آمنة.</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '1rem', color: '#10b981' }}>
                  <FileText size={28} />
                </div>
                <div>
                  <h3 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>استخراج سريع</h3>
                  <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>نظام OCR متطور لقراءة مئات الشهادات ومطابقتها في ثوانٍ.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#ffffff', position: 'relative' }}>
        <div style={{ width: '100%', maxWidth: 450 }}>
          
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>
              {isResetMode ? 'استعادة الوصول' : 'مرحباً مجدداً'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
              {isResetMode ? 'أدخل بريد الإدارة والرقم الوزاري لإنشاء كلمة مرور مؤقتة جديدة.' : 'قم بتسجيل الدخول لإدارة بيانات مدرستك.'}
            </p>
          </div>

          {error && (
            <div className="animate-fade-in" style={{ padding: '1rem 1.5rem', background: temporaryPassword ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: temporaryPassword ? '#10b981' : '#ef4444', borderRadius: '1rem', marginBottom: '2rem', fontWeight: 600, display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {temporaryPassword ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              {error}
            </div>
          )}

          {temporaryPassword && (
            <div className="animate-fade-in" style={{ background: '#f8fafc', border: '2px solid #bbf7d0', borderRadius: '1rem', padding: '1rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: '#166534', fontWeight: 800, marginBottom: '0.75rem' }}>كلمة المرور المؤقتة</label>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <code style={{ flex: 1, background: 'white', border: '1px solid #dcfce7', borderRadius: '0.75rem', padding: '1rem', direction: 'ltr', textAlign: 'center', fontWeight: 900, color: '#0f172a', letterSpacing: '1px' }}>
                  {temporaryPassword}
                </code>
                <button type="button" onClick={copyTemporaryPassword} style={{ width: 48, height: 48, borderRadius: '0.75rem', border: 'none', background: '#10b981', color: 'white', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                  {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 700, color: '#334155' }}>البريد الإلكتروني للإدارة</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email" 
                  required
                  placeholder="admin@school.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ 
                    width: '100%', padding: '1.25rem 1.25rem 1.25rem 3rem', borderRadius: '1rem', 
                    border: '2px solid #e2e8f0', background: '#f8fafc', fontSize: '1.1rem',
                    transition: 'all 0.2s', outline: 'none', direction: 'ltr', textAlign: 'left'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
                <Mail size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>

            {!isResetMode && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontWeight: 700, color: '#334155' }}>كلمة المرور</label>
                  <button type="button" onClick={() => { setIsResetMode(true); setError(''); }} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ 
                      width: '100%', padding: '1.25rem 1.25rem 1.25rem 3rem', borderRadius: '1rem', 
                      border: '2px solid #e2e8f0', background: '#f8fafc', fontSize: '1.1rem',
                      transition: 'all 0.2s', outline: 'none', direction: 'ltr', textAlign: 'left',
                      letterSpacing: '3px'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <Lock size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>
            )}

            {isResetMode && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 700, color: '#334155' }}>الرقم الوزاري للمدرسة</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 123456"
                    value={ministerialNumber}
                    onChange={(e) => setMinisterialNumber(e.target.value)}
                    style={{
                      width: '100%', padding: '1.25rem 1.25rem 1.25rem 3rem', borderRadius: '1rem',
                      border: '2px solid #e2e8f0', background: '#f8fafc', fontSize: '1.1rem',
                      transition: 'all 0.2s', outline: 'none', direction: 'ltr', textAlign: 'left'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <ShieldCheck size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>
            )}

            {!isResetMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input type="checkbox" id="remember" style={{ width: 18, height: 18, accentColor: '#2563eb', cursor: 'pointer' }} />
                <label htmlFor="remember" style={{ color: '#475569', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>تذكرني في المرة القادمة</label>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                marginTop: '1rem', padding: '1.25rem', fontSize: '1.2rem', fontWeight: 800,
                background: 'linear-gradient(135deg, #2563eb, #38bdf8)', color: 'white',
                border: 'none', borderRadius: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                boxShadow: '0 10px 25px rgba(37,99,235,0.3)', transition: 'all 0.2s'
              }}
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : (isResetMode ? 'إنشاء كلمة مرور مؤقتة' : 'دخول للوحة التحكم')}
            </button>
            
            {isResetMode && (
              <button 
                type="button" 
                onClick={() => { setIsResetMode(false); setError(''); setTemporaryPassword(''); setMinisterialNumber(''); }}
                style={{ 
                  background: 'none', border: 'none', color: '#64748b', fontWeight: 700, 
                  fontSize: '1rem', cursor: 'pointer', padding: '1rem', marginTop: '-0.5rem'
                }}
              >
                العودة لتسجيل الدخول
              </button>
            )}
          </form>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <p style={{ color: '#64748b', fontSize: '1.05rem', fontWeight: 600 }}>
              مدرسة جديدة؟ 
              <Link href="/register" style={{ color: '#2563eb', fontWeight: 800, textDecoration: 'none', marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                افتح حساب مدرستك <ArrowRight size={16} />
              </Link>
            </p>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 1023px) {
          .desktop-only { display: none !important; }
        }
      `}</style>
    </div>
  );
}

type LoginSchool = {
  id: string;
  name: string;
  is_active?: boolean | null;
  is_portal_active?: boolean | null;
  subscription_end_date?: string | null;
  subscription_plan?: string | null;
  contact_email?: string | null;
};

async function signInSchool(email: string, password: string): Promise<LoginSchool | null> {
  const cleanEmail = email.trim().toLowerCase();

  const authResult = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (!authResult.error && authResult.data.user) {
    const userId = authResult.data.user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id, schools(*)")
      .eq("id", userId)
      .maybeSingle();

    const profileSchool = normalizeJoinedSchool((profile as any)?.schools);
    if (profileSchool) return profileSchool;

    const { data: linkedSchool } = await supabase
      .from("schools")
      .select("*")
      .or(`auth_user_id.eq.${userId},contact_email.eq.${cleanEmail}`)
      .maybeSingle();

    if (linkedSchool) return linkedSchool as LoginSchool;
  }

  const { data, error } = await supabase.rpc("verify_school_login", {
    input_email: cleanEmail,
    input_password: password,
  });

  if (error) throw error;
  return Array.isArray(data) && data.length > 0 ? (data[0] as LoginSchool) : null;
}

function normalizeJoinedSchool(school: unknown): LoginSchool | null {
  if (!school) return null;
  return (Array.isArray(school) ? school[0] : school) as LoginSchool;
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(8);
  window.crypto.getRandomValues(bytes);
  return `NTAJE-${Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("")}`;
}
