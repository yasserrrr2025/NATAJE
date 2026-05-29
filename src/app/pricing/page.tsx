"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Zap, Building, Crown, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function PricingPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPackages() {
      const { data } = await supabase
        .from('subscription_packages')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
        
      if (data && data.length > 0) {
        setPackages(data);
      }
      setLoading(false);
    }
    loadPackages();
  }, []);

  return (
    <div className="page-container animate-fade-in" style={{ padding: '4rem 1rem' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="heading-1" style={{ fontSize: '3rem', marginBottom: '1rem' }}>باقات الاشتراك للمدارس</h1>
        <p className="text-muted" style={{ fontSize: '1.25rem', maxWidth: 600, margin: '0 auto' }}>
          اختر الباقة الأنسب لحجم مدرستك وابدأ بتوفير الجهد والوقت في إدارة الشهادات.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={48} style={{ margin: '0 auto', color: 'var(--primary)' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: 1100, margin: '0 auto' }}>
          
          {packages.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', background: 'var(--card)', borderRadius: '1rem' }}>
              <p className="text-muted" style={{ fontSize: '1.25rem' }}>جاري تحديث الباقات من قبل الإدارة...</p>
            </div>
          ) : (
            packages.map((pkg, idx) => (
              <div key={pkg.id} className="glass-card" style={{ padding: '3rem 2rem', position: 'relative', border: pkg.is_popular ? '2px solid var(--primary)' : '1px solid var(--card-border)', transform: pkg.is_popular ? 'scale(1.05)' : 'none', zIndex: pkg.is_popular ? 10 : 1, boxShadow: pkg.is_popular ? '0 25px 50px -12px rgba(37,99,235,0.25)' : 'var(--shadow)' }}>
                {pkg.is_popular && (
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--primary)', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '2rem', fontWeight: 700, fontSize: '0.9rem' }}>
                    الأكثر طلباً
                  </div>
                )}
                <div style={{ marginBottom: '2rem' }}>
                  {idx === 0 ? <Building size={36} style={{ color: 'var(--muted)', marginBottom: '1rem' }} /> : 
                   pkg.is_popular ? <Zap size={36} style={{ color: 'var(--primary)', marginBottom: '1rem' }} /> :
                   <Crown size={36} style={{ color: '#f59e0b', marginBottom: '1rem' }} />}
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: pkg.is_popular ? 'var(--primary)' : 'inherit' }}>{pkg.name}</h3>
                  <p className="text-muted">{pkg.description}</p>
                </div>
                <div style={{ marginBottom: '2rem' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 900 }}>{pkg.price}</span>
                  <span className="text-muted" style={{ fontSize: '1.25rem' }}> ريال / {pkg.duration_months === 1 ? 'شهرياً' : pkg.duration_months === 3 ? 'فصلياً' : pkg.duration_months === 12 ? 'سنوياً' : `${pkg.duration_months} أشهر`}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 3rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(pkg.features || []).map((feature: string, fIdx: number) => (
                    <li key={fIdx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <CheckCircle size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} /> 
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/checkout?plan=${pkg.id}`} className={`btn ${pkg.is_popular ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', justifyContent: 'center' }}>
                  اشترك الآن
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
