"use client";

import { Suspense, useState, useEffect } from "react";
import { CreditCard, ShieldCheck, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams?.get('plan');
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [pkg, setPkg] = useState<any>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [discountCode, setDiscountCode] = useState("");
  const [coupon, setCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    async function initCheckout() {
      // Get the current school (in real app, get from Auth context)
      const { data: schools } = await supabase.from('schools').select('id').limit(1);
      if (schools && schools.length > 0) {
        setSchoolId(schools[0].id);
      }

      if (planId) {
        const { data } = await supabase.from('subscription_packages').select('*').eq('id', planId).single();
        if (data) setPkg(data);
      }
      setLoading(false);
    }
    initCheckout();
  }, [planId]);

  const basePrice = pkg ? Number(pkg.price) : 0;
  const finalPrice = coupon ? basePrice - (basePrice * (coupon.discount_percentage / 100)) : basePrice;

  const handleApplyDiscount = async () => {
    setCouponError("");
    if (!discountCode.trim()) return;

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', discountCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      setCouponError("كود الخصم غير صحيح أو منتهي الصلاحية");
      setCoupon(null);
      return;
    }

    if (data.max_uses && data.used_count >= data.max_uses) {
      setCouponError("تم تجاوز الحد الأقصى لاستخدام هذا الكود");
      setCoupon(null);
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCouponError("انتهت صلاحية كود الخصم");
      setCoupon(null);
      return;
    }

    setCoupon(data);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !pkg) return;
    
    setProcessing(true);
    
    // Simulate payment gateway delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 1. Log the payment
    const { error: paymentError } = await supabase.from('subscription_payments').insert([{
      school_id: schoolId,
      package_id: pkg.id,
      amount_paid: finalPrice,
      coupon_id: coupon ? coupon.id : null,
      payment_status: 'PAID',
      payment_method: 'CREDIT_CARD',
      reference_number: `PAY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    }]);

    if (!paymentError) {
      // 2. Update Coupon Usage
      if (coupon) {
        await supabase.from('coupons').update({ used_count: coupon.used_count + 1 }).eq('id', coupon.id);
      }

      // 3. Update School Subscription Date
      // calculate new date
      const newEndDate = new Date();
      newEndDate.setMonth(newEndDate.getMonth() + pkg.duration_months);

      await supabase.from('schools').update({
        subscription_plan: pkg.name,
        subscription_end_date: newEndDate.toISOString()
      }).eq('id', schoolId);

      alert("تم الدفع بنجاح! تم تجديد اشتراك مدرستك.");
      router.push('/admin');
    } else {
      alert("حدث خطأ أثناء معالجة الدفع.");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '80vh' }}>
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="flex-center" style={{ minHeight: '80vh', flexDirection: 'column', gap: '1rem' }}>
        <h2>لم يتم اختيار باقة</h2>
        <button onClick={() => router.push('/pricing')} className="btn btn-primary">العودة للباقات</button>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in" style={{ padding: '3rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="heading-1">إتمام الدفع الآمن</h1>
        <p className="text-muted">نظام دفع آمن وموثق 100%</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: 1000, margin: '0 auto' }}>
        
        {/* Payment Form */}
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CreditCard size={28} style={{ color: 'var(--primary)' }} />
            بيانات البطاقة
          </h3>
          
          <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label className="label">الاسم على البطاقة</label>
              <input type="text" className="input" required placeholder="مثال: AHMED KHALID" />
            </div>
            
            <div>
              <label className="label">رقم البطاقة (مدى / فيزا / ماستركارد)</label>
              <input type="text" className="input" required placeholder="0000 0000 0000 0000" style={{ direction: 'ltr', textAlign: 'left', letterSpacing: '2px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label className="label">تاريخ الانتهاء</label>
                <input type="text" className="input" required placeholder="MM/YY" style={{ direction: 'ltr', textAlign: 'left' }} />
              </div>
              <div>
                <label className="label">رمز الأمان (CVV)</label>
                <input type="text" className="input" required placeholder="123" style={{ direction: 'ltr', textAlign: 'left' }} />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={processing}
              style={{ marginTop: '1.5rem', padding: '1.25rem', fontSize: '1.25rem', borderRadius: '1rem', width: '100%', justifyContent: 'center' }}
            >
              {processing ? <Loader2 size={28} className="animate-spin" /> : `ادفع الآن (${finalPrice.toFixed(2)} ريال)`}
            </button>
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <ShieldCheck size={16} /> المدفوعات محمية بواسطة التشفير البنكي
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="glass-card" style={{ padding: '2.5rem', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem' }}>ملخص الطلب</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--card-border)' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{pkg.name}</p>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>المدة: {pkg.duration_months} أشهر</p>
            </div>
            <p style={{ fontWeight: 800, fontSize: '1.2rem' }}>{basePrice} ريال</p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label className="label">كود الخصم / العرض</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="أدخل الكود" 
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  disabled={!!coupon || processing}
                  style={{ direction: 'ltr', textAlign: 'left', width: '100%' }}
                />
                {couponError && <p style={{ color: 'var(--destructive)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{couponError}</p>}
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleApplyDiscount}
                disabled={!!coupon || !discountCode || processing}
              >
                تطبيق
              </button>
            </div>
            {coupon && (
              <p style={{ color: 'var(--accent)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 700 }}>
                تم تطبيق خصم {coupon.discount_percentage}% بنجاح!
              </p>
            )}
          </div>

          <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <p className="text-muted">المجموع الفرعي</p>
              <p style={{ fontWeight: 600 }}>{basePrice} ريال</p>
            </div>
            {coupon && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--accent)' }}>
                <p>الخصم ({coupon.discount_percentage}%)</p>
                <p style={{ fontWeight: 600 }}>- {(basePrice * (coupon.discount_percentage / 100)).toFixed(2)} ريال</p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p className="text-muted">الضريبة المضافة (15%)</p>
              <p style={{ fontWeight: 600 }}>شاملة</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--card-border)', paddingTop: '1rem', marginTop: '1rem' }}>
              <p style={{ fontWeight: 800, fontSize: '1.25rem' }}>الإجمالي</p>
              <p style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--primary)' }}>{finalPrice.toFixed(2)} ريال</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-center" style={{ minHeight: "80vh" }}>
          <Loader2 className="animate-spin text-primary" size={48} />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
