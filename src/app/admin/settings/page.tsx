"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Settings, Copy, CheckCircle, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getCurrentSchoolId } from "@/lib/school-session";

export default function SchoolSettingsPage() {
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchSchool = async () => {
      const schoolId = getCurrentSchoolId();
      if (!schoolId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.from('schools').select('*').eq('id', schoolId).maybeSingle();
      if (data) {
        setSchool(data);
      }
      setLoading(false);
    };
    fetchSchool();
  }, []);

  const getPortalUrl = () => {
    if (!school) return "";
    return `${window.location.origin}/portal/${school.slug}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getPortalUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="page-container flex-center">جاري تحميل الإعدادات...</div>;
  }

  if (!school) {
    return (
      <div className="page-container flex-center">
        <p className="text-muted">لم يتم العثور على مدرسة. يرجى تسجيل المدرسة أولاً.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800 }}>
      <h1 className="heading-2" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Settings size={28} style={{ color: 'var(--primary)' }} />
        إعدادات المدرسة والبوابة
      </h1>
      <p className="text-muted" style={{ marginBottom: '2rem' }}>
        قم بإدارة بيانات مدرستك، واحصل على الرابط المخصص لمشاركته مع الطلاب للاستعلام عن شهاداتهم.
      </p>

      <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem', borderTop: '4px solid var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem' }}>
          
          <div style={{ flex: 1, minWidth: 300 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} style={{ color: 'var(--accent)' }} />
              بوابة استعلام الطلاب (الرابط السحري)
            </h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              هذا هو الرابط الوحيد الذي يجب مشاركته مع الطلاب وأولياء الأمور في رسائل SMS أو الواتساب.
            </p>

            <div style={{ background: 'var(--background)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
              <code style={{ flex: 1, padding: '1rem', fontSize: '1.1rem', color: 'var(--primary)', direction: 'ltr', textAlign: 'left', fontWeight: 600 }}>
                {getPortalUrl()}
              </code>
              <button 
                onClick={handleCopy}
                className="btn btn-primary" 
                style={{ borderRadius: 0, height: '100%', padding: '1.1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                {copied ? 'تم النسخ!' : 'نسخ الرابط'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>تجربة البوابة</p>
            <Link 
              href={`/portal/${school.slug}`} 
              target="_blank"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              فتح البوابة كطالب <ExternalLink size={18} />
            </Link>
          </div>

        </div>
      </div>

      <div className="grid-2">
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
            بيانات المدرسة الأساسية
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>اسم المدرسة</p>
              <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{school.name}</p>
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>الرقم الوزاري</p>
              <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{school.ministerial_number}</p>
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>الشعار</p>
              <img src={school.logo_url} alt="شعار المدرسة" style={{ height: 60, objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
