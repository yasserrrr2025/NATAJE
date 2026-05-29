"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Ticket, Plus, Edit2, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    code: "",
    discount_percentage: 10,
    max_uses: "", // empty means unlimited
    expires_at: "", // empty means never
    is_active: true
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setCoupons(data);
    setLoading(false);
  };

  const handleOpenModal = (coupon: any = null) => {
    if (coupon) {
      setFormData({
        id: coupon.id,
        code: coupon.code,
        discount_percentage: coupon.discount_percentage,
        max_uses: coupon.max_uses ? coupon.max_uses.toString() : "",
        expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : "",
        is_active: coupon.is_active
      });
    } else {
      setFormData({
        id: "",
        code: "",
        discount_percentage: 10,
        max_uses: "",
        expires_at: "",
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      code: formData.code.toUpperCase(),
      discount_percentage: formData.discount_percentage,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      is_active: formData.is_active
    };

    if (formData.id) {
      const { error } = await supabase.from('coupons').update(payload).eq('id', formData.id);
      if (error) alert("خطأ: " + error.message);
    } else {
      const { error } = await supabase.from('coupons').insert([payload]);
      if (error) alert("خطأ: " + error.message);
    }

    await fetchCoupons();
    setIsModalOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الكوبون؟")) {
      await supabase.from('coupons').delete().eq('id', id);
      fetchCoupons();
    }
  };

  const toggleActive = async (coupon: any) => {
    await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
    fetchCoupons();
  };

  return (
    <>
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Ticket size={32} style={{ color: '#10b981' }} />
              عروض الخصم (الكوبونات)
            </h1>
            <p style={{ color: '#94a3b8' }}>إدارة الكوبونات الترويجية، تحديد نسب الخصم وعدد الاستخدامات المسموحة.</p>
          </div>

          <button 
            onClick={() => handleOpenModal()}
            style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <Plus size={20} />
            إنشاء كوبون جديد
          </button>
        </div>

        <div style={{ background: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}><Loader2 className="animate-spin" size={32} style={{ margin: '0 auto' }} /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    <th style={{ padding: '1.25rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>رمز الكوبون</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>نسبة الخصم</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>الاستخدامات</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>تاريخ الانتهاء</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>الحالة</th>
                    <th style={{ padding: '1.25rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>إدارة</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>لا توجد كوبونات حالياً.</td>
                    </tr>
                  ) : coupons.map((coupon) => (
                    <tr key={coupon.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '1.25rem 1.5rem', color: 'white', fontWeight: 800, letterSpacing: '2px' }}>{coupon.code}</td>
                      <td style={{ padding: '1.25rem 1.5rem', color: '#10b981', fontWeight: 700 }}>%{coupon.discount_percentage}</td>
                      <td style={{ padding: '1.25rem 1.5rem', color: '#cbd5e1' }}>
                        {coupon.used_count} / {coupon.max_uses ? coupon.max_uses : 'غير محدود'}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', color: '#cbd5e1' }}>
                        {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString('ar-SA') : 'لا يوجد'}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <button 
                          onClick={() => toggleActive(coupon)}
                          style={{ 
                            background: coupon.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                            color: coupon.is_active ? '#10b981' : '#ef4444', 
                            border: 'none', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' 
                          }}
                        >
                          {coupon.is_active ? <><CheckCircle size={14}/> مُفعّل</> : <><XCircle size={14}/> مُعطّل</>}
                        </button>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleOpenModal(coupon)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(coupon.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)', padding: '1rem' }}>
          <div style={{ background: '#1e293b', padding: '2.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: 500, border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem', color: 'white' }}>
              {formData.id ? 'تعديل الكوبون' : 'إنشاء كوبون جديد'}
            </h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>رمز الكوبون</label>
                <input type="text" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} style={{ width: '100%', padding: '1rem', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '0.75rem', outline: 'none', letterSpacing: '2px', textTransform: 'uppercase' }} placeholder="مثال: NTAJE2026" />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>نسبة الخصم (%)</label>
                <input type="number" required min="1" max="100" value={formData.discount_percentage} onChange={e => setFormData({...formData, discount_percentage: Number(e.target.value)})} style={{ width: '100%', padding: '1rem', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '0.75rem', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>أقصى عدد للاستخدام</label>
                  <input type="number" value={formData.max_uses} onChange={e => setFormData({...formData, max_uses: e.target.value})} style={{ width: '100%', padding: '1rem', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '0.75rem', outline: 'none' }} placeholder="غير محدود" />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>تاريخ الانتهاء</label>
                  <input type="date" value={formData.expires_at} onChange={e => setFormData({...formData, expires_at: e.target.value})} style={{ width: '100%', padding: '1rem', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '0.75rem', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '1.25rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {saving ? <Loader2 size={24} className="animate-spin" /> : 'حفظ الكوبون'}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={saving} style={{ flex: 1, padding: '1.25rem', background: 'transparent', color: 'white', border: '1px solid #334155', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
