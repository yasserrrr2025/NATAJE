"use client";

import { LayoutDashboard, Users, FileUp, FileText, CheckCircle, Settings, AlertTriangle, CreditCard, Loader2, LifeBuoy, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearSchoolSession, getCurrentSchoolId } from "@/lib/school-session";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkSubscription() {
      const schoolId = getCurrentSchoolId();
      if (!schoolId) {
        router.replace('/login');
        return;
      }

      const { data } = await supabase.from('schools').select('*').eq('id', schoolId).maybeSingle();
      if (!data) {
        clearSchoolSession();
        router.replace('/login');
        return;
      }

      setSchool(data);
      setLoading(false);
    }
    checkSubscription();
  }, [router]);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  // Check if school is disabled by Super Admin or subscription is expired
  const isExpired = school?.subscription_end_date && new Date(school.subscription_end_date) < new Date();
  const isDeactivated = school?.is_active === false;

  if (isExpired || isDeactivated) {
    return (
      <div className="flex-center animate-fade-in" style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem' }}>
        <div className="glass-card" style={{ maxWidth: 500, width: '100%', padding: '4rem 3rem', textAlign: 'center', borderTop: '6px solid var(--destructive)', boxShadow: '0 25px 50px rgba(0,0,0,0.1)' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1.5rem', borderRadius: '50%', display: 'inline-flex', marginBottom: '2rem' }}>
            <AlertTriangle size={48} style={{ color: 'var(--destructive)' }} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--foreground)' }}>
            {isDeactivated ? 'الحساب معلق' : 'انتهى اشتراك المدرسة'}
          </h1>
          <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '3rem', lineHeight: 1.6 }}>
            {isDeactivated 
              ? 'تم إيقاف الخدمة عن هذه المدرسة من قبل الإدارة المركزية. يرجى التواصل مع الدعم الفني.'
              : 'لقد انتهت فترة الاشتراك الخاصة بمدرستك. للاستمرار في استخدام المنصة، يرجى تجديد الاشتراك.'}
          </p>
          
          <Link href="/pricing" className="btn btn-primary" style={{ padding: '1.25rem 2rem', fontSize: '1.2rem', width: '100%', justifyContent: 'center', borderRadius: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <CreditCard size={24} />
            {isDeactivated ? 'التواصل مع الدعم الفني' : 'تجديد الاشتراك الآن'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)' }}>
      {/* Sidebar */}
      <aside style={{ width: '280px', background: 'var(--card)', borderLeft: '1px solid var(--card-border)', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ padding: '0 1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>لوحة الإدارة</h2>
          {school?.subscription_end_date && (
            <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.5rem', fontWeight: 600 }}>
              ينتهي الاشتراك: {new Date(school.subscription_end_date).toLocaleDateString('ar-SA')}
            </p>
          )}
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 'var(--radius)', transition: 'background 0.2s', fontWeight: 600 }} className="hover-bg">
            <LayoutDashboard size={20} />
            نظرة عامة
          </Link>
          <Link href="/admin/students" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 'var(--radius)', transition: 'background 0.2s', fontWeight: 600 }} className="hover-bg">
            <Users size={20} />
            بيانات الطلاب (نور)
          </Link>
          <Link href="/admin/upload" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 'var(--radius)', transition: 'background 0.2s', fontWeight: 600 }} className="hover-bg">
            <FileUp size={20} />
            معالجة الشهادات PDF
          </Link>
          <Link href="/admin/certificates" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 'var(--radius)', transition: 'background 0.2s', fontWeight: 600 }} className="hover-bg">
            <FileText size={20} />
            إدارة الشهادات
          </Link>
          <Link href="/admin/billing" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 'var(--radius)', transition: 'background 0.2s', fontWeight: 600 }} className="hover-bg">
            <ReceiptText size={20} />
            الاشتراك والفواتير
          </Link>
          <Link href="/admin/support" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 'var(--radius)', transition: 'background 0.2s', fontWeight: 600 }} className="hover-bg">
            <LifeBuoy size={20} />
            تذاكر الدعم
          </Link>
          <Link href="/admin/honors" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 'var(--radius)', transition: 'background 0.2s', fontWeight: 600 }} className="hover-bg">
            <CheckCircle size={20} />
            لوحة الشرف (المتفوقين)
          </Link>
          <Link href="/admin/review" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 'var(--radius)', transition: 'background 0.2s', fontWeight: 600 }} className="hover-bg">
            <CheckCircle size={20} />
            المراجعة والمطابقة
          </Link>
          <Link href="/admin/settings" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 'var(--radius)', transition: 'background 0.2s', fontWeight: 600 }} className="hover-bg">
            <Settings size={20} />
            إعدادات المدرسة
          </Link>
        </nav>
        
        <style>{`
          .hover-bg:hover {
            background: var(--secondary);
          }
        `}</style>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
