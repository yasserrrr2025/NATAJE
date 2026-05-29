"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowRight, School, Link as LinkIcon, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterSchoolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [schoolSlug, setSchoolSlug] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    ministerial_number: "",
    contact_email: "",
    password: "",
    slug: ""
  });

  const handleSlugChange = (val: string) => {
    // Only allow english letters and numbers for the slug
    const cleanSlug = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({ ...formData, slug: cleanSlug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Insert School
      const { data: newSchool, error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: formData.name,
          ministerial_number: formData.ministerial_number,
          contact_email: formData.contact_email,
          password: formData.password,
          slug: formData.slug || formData.ministerial_number, // fallback to ministerial num
          logo_url: "https://upload.wikimedia.org/wikipedia/ar/1/17/Saudi_Ministry_of_Education_Logo_2025.png"
        })
        .select()
        .single();

      if (schoolError) {
        if (schoolError.code === '23505') {
          throw new Error("عفواً، الرابط المخصص أو الرقم الوزاري مسجل مسبقاً لمدرسة أخرى.");
        }
        throw schoolError;
      }

      setSchoolSlug(newSchool.slug);
      setSuccess(true);
      
      // Auto redirect to admin dashboard after 3 seconds
      setTimeout(() => {
        router.push('/admin');
      }, 3000);

    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-container flex-center animate-fade-in" style={{ minHeight: '80vh' }}>
        <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: '3rem 2rem', textAlign: 'center' }}>
          <CheckCircle size={64} style={{ color: 'var(--accent)', margin: '0 auto 1.5rem' }} />
          <h2 className="heading-2" style={{ marginBottom: '1rem', color: 'var(--accent)' }}>تم تسجيل المدرسة بنجاح!</h2>
          <p className="text-muted" style={{ marginBottom: '2rem' }}>
            رابط بوابة الاستعلام الخاص بطلابك هو:
            <br/>
            <code style={{ display: 'block', margin: '1rem 0', padding: '1rem', background: 'var(--background)', color: 'var(--primary)', borderRadius: 'var(--radius)', fontSize: '1.2rem', fontWeight: 700 }}>
              {typeof window !== 'undefined' ? window.location.origin : ''}/portal/{schoolSlug}
            </code>
          </p>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>جاري تحويلك إلى لوحة تحكم الإدارة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container flex-center animate-fade-in" style={{ minHeight: '80vh', padding: '2rem 1rem' }}>
      
      {/* Dynamic Background Effect */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: -1 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: -1 }} />

      <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: '3rem 2rem', position: 'relative' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img 
            src="https://upload.wikimedia.org/wikipedia/ar/1/17/Saudi_Ministry_of_Education_Logo_2025.png" 
            alt="شعار وزارة التعليم" 
            style={{ height: 90, margin: '0 auto 1.5rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} 
          />
          <h1 className="heading-2" style={{ marginBottom: '0.5rem' }}>تسجيل مدرسة جديدة</h1>
          <p className="text-muted">انضم إلى منصة شهاداتي وابدأ أتمتة أعمالك</p>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', color: 'var(--destructive)', borderRadius: 'var(--radius)', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <label className="label flex-between">
              اسم المدرسة <School size={16} style={{ color: 'var(--primary)' }} />
            </label>
            <input 
              type="text" 
              className="input" 
              required
              placeholder="مثال: متوسطة الفلاح الأهلية" 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="label">الرقم الوزاري</label>
            <input 
              type="text" 
              className="input" 
              required
              placeholder="مثال: 123456" 
              value={formData.ministerial_number}
              onChange={e => setFormData({ ...formData, ministerial_number: e.target.value })}
            />
          </div>

          <div>
            <label className="label">البريد الإلكتروني للتواصل (تسجيل الدخول)</label>
            <input 
              type="email" 
              className="input" 
              required
              placeholder="admin@school.com" 
              style={{ direction: 'ltr', textAlign: 'left' }}
              value={formData.contact_email}
              onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
            />
          </div>

          <div>
            <label className="label">كلمة المرور (تسجيل الدخول)</label>
            <input 
              type="password" 
              className="input" 
              required
              placeholder="••••••••" 
              minLength={6}
              style={{ direction: 'ltr', textAlign: 'left', letterSpacing: '3px' }}
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
              يجب أن تتكون من 6 أحرف أو أرقام على الأقل.
            </p>
          </div>

          <div>
            <label className="label flex-between">
              الرابط المخصص للبوابة <LinkIcon size={16} style={{ color: 'var(--primary)' }} />
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', direction: 'ltr' }}>
                /portal/
              </span>
              <input 
                type="text" 
                className="input" 
                required
                placeholder="alfalah" 
                style={{ paddingLeft: '4.5rem', direction: 'ltr', textAlign: 'left' }}
                value={formData.slug}
                onChange={e => handleSlugChange(e.target.value)}
              />
            </div>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
              سيستخدم الطلاب هذا الرابط للوصول لشهاداتهم (أحرف إنجليزية فقط).
            </p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ marginTop: '1rem', padding: '1.25rem', fontSize: '1.1rem' }}
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : 'إنشاء حساب المدرسة'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link href="/" className="text-muted" style={{ fontSize: '0.9rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowRight size={16} /> العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
