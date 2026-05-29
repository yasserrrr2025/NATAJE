"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Plus, Edit2, Trash2, CheckCircle, Loader2, Star } from "lucide-react";

export default function ManagePackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    price: 0,
    duration_months: 1, // 1 for monthly
    is_popular: false,
    features: [""]
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('subscription_packages')
      .select('*')
      .order('price', { ascending: true });
    
    // If empty, we can show an empty state. But we just load them.
    if (data) setPackages(data);
    setLoading(false);
  };

  const handleOpenModal = (pkg: any = null) => {
    if (pkg) {
      setFormData({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description || "",
        price: pkg.price,
        duration_months: pkg.duration_months,
        is_popular: pkg.is_popular,
        features: pkg.features && pkg.features.length > 0 ? pkg.features : [""]
      });
    } else {
      setFormData({
        id: "",
        name: "",
        description: "",
        price: 0,
        duration_months: 1,
        is_popular: false,
        features: [""]
      });
    }
    setIsModalOpen(true);
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ""] });
  };

  const removeFeature = (index: number) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures.length ? newFeatures : [""] });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: formData.name,
      description: formData.description,
      price: formData.price,
      duration_months: formData.duration_months,
      is_popular: formData.is_popular,
      features: formData.features.filter(f => f.trim() !== "")
    };

    if (formData.id) {
      // Update
      await supabase.from('subscription_packages').update(payload).eq('id', formData.id);
    } else {
      // Insert
      await supabase.from('subscription_packages').insert([payload]);
    }

    await fetchPackages();
    setIsModalOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الباقة؟")) {
      await supabase.from('subscription_packages').delete().eq('id', id);
      fetchPackages();
    }
  };

  return (
    <>
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Package size={32} style={{ color: '#fbbf24' }} />
            إدارة الباقات والاشتراكات
          </h1>
          <p style={{ color: '#94a3b8' }}>صمم باقاتك بحرية (شهرية، فصلية، سنوية) وحدد مميزات كل باقة بديناميكية تامة.</p>
        </div>

        <button 
          onClick={() => handleOpenModal()}
          style={{ background: '#fbbf24', color: '#0f172a', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <Plus size={20} />
          إنشاء باقة جديدة
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}><Loader2 className="animate-spin" size={32} style={{ margin: '0 auto' }} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {packages.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', background: '#1e293b', borderRadius: '1rem', border: '1px dashed #334155' }}>
              <p style={{ color: '#94a3b8', fontSize: '1.2rem' }}>لا توجد باقات حالياً. قم بإنشاء باقتك الأولى!</p>
            </div>
          ) : (
            packages.map(pkg => (
              <div key={pkg.id} style={{ background: '#1e293b', borderRadius: '1rem', border: pkg.is_popular ? '2px solid #fbbf24' : '1px solid #334155', padding: '2rem', position: 'relative' }}>
                {pkg.is_popular && (
                  <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#fbbf24', color: '#0f172a', padding: '0.25rem 1rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 800 }}>الأكثر طلباً</span>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0 }}>{pkg.name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleOpenModal(pkg)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(pkg.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <p style={{ color: '#94a3b8', marginBottom: '1.5rem', minHeight: '40px' }}>{pkg.description}</p>
                
                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white' }}>{pkg.price}</span>
                  <span style={{ color: '#94a3b8' }}>
                    ريال / {
                      Number(pkg.duration_months) === 1 ? 'شهرياً' : 
                      Number(pkg.duration_months) === 3 ? 'فصلياً (3 أشهر)' : 
                      Number(pkg.duration_months) === 4 ? 'فصل دراسي (4 أشهر)' : 
                      Number(pkg.duration_months) === 6 ? 'نصف سنوي (6 أشهر)' : 
                      Number(pkg.duration_months) === 12 ? 'سنوياً' : 
                      `${pkg.duration_months} أشهر`
                    }
                  </span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(pkg.features || []).map((feature: string, idx: number) => (
                    <li key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', color: '#e2e8f0' }}>
                      <CheckCircle size={18} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)', padding: '1rem' }}>
          <div style={{ background: '#1e293b', padding: '2.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: 600, border: '1px solid #334155', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem', color: 'white' }}>
              {formData.id ? 'تعديل الباقة' : 'إنشاء باقة جديدة'}
            </h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>اسم الباقة</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '1rem', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '0.75rem', outline: 'none' }} placeholder="مثال: الباقة الأساسية" />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>السعر (ريال)</label>
                  <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} style={{ width: '100%', padding: '1rem', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '0.75rem', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>مدة الاشتراك</label>
                  <select value={Number(formData.duration_months)} onChange={e => setFormData({...formData, duration_months: Number(e.target.value)})} style={{ width: '100%', padding: '1rem', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '0.75rem', outline: 'none' }}>
                    <option value={1}>شهري (شهر واحد)</option>
                    <option value={3}>فصلي (3 أشهر)</option>
                    <option value={4}>فصل دراسي (4 أشهر)</option>
                    <option value={6}>نصف سنوي (6 أشهر)</option>
                    <option value={12}>سنوي (12 شهر)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#0f172a', padding: '1rem', border: '1px solid #334155', borderRadius: '0.75rem', width: '100%', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.is_popular} onChange={e => setFormData({...formData, is_popular: e.target.checked})} style={{ width: '1.2rem', height: '1.2rem' }} />
                    <span style={{ color: 'white', fontWeight: 600 }}><Star size={18} style={{ color: '#fbbf24', verticalAlign: 'middle', marginLeft: '5px' }}/>تحديد كباقة مفضلة</span>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>وصف الباقة (اختياري)</label>
                <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '1rem', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '0.75rem', outline: 'none' }} placeholder="وصف قصير لمن تناسب هذه الباقة..." />
              </div>

              <div style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ color: 'white', fontWeight: 700 }}>مميزات الباقة</label>
                  <button type="button" onClick={addFeature} style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>+ إضافة ميزة</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {formData.features.map((feature, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        value={feature}
                        onChange={(e) => handleFeatureChange(idx, e.target.value)}
                        placeholder={`ميزة رقم ${idx + 1}`}
                        style={{ flex: 1, padding: '0.75rem 1rem', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '0.5rem', outline: 'none' }}
                      />
                      <button type="button" onClick={() => removeFeature(idx)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '1.25rem', background: '#fbbf24', color: '#0f172a', border: 'none', borderRadius: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {saving ? <Loader2 size={24} className="animate-spin" /> : 'حفظ ونشر الباقة'}
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
