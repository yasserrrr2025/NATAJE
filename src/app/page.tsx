import { Search, Users, ArrowLeft, GraduationCap, Zap, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background Gradients */}
      <div style={{ position: 'absolute', top: -200, left: -100, width: 600, height: 600, background: 'radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%)', borderRadius: '50%', zIndex: -1 }} />
      <div style={{ position: 'absolute', top: 100, right: -200, width: 800, height: 800, background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)', borderRadius: '50%', zIndex: -1 }} />

      <div className="page-container animate-fade-in" style={{ paddingBottom: '6rem' }}>
        
        {/* Hero Section */}
        <section style={{ textAlign: 'center', padding: '6rem 1rem', maxWidth: 900, margin: '0 auto', position: 'relative' }}>
          <div className="animate-fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: 'var(--card)', padding: '0.5rem 1.5rem', borderRadius: '2rem', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow)', marginBottom: '2rem', backdropFilter: 'blur(10px)' }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>النظام الأول المعتمد في المملكة</span>
          </div>

          <h1 className="heading-1" style={{ fontSize: '4rem', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '1.5rem' }}>
            إدارة وتوزيع الشهادات المدرسية <br/>
            <span style={{ background: 'linear-gradient(90deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              بذكاء اصطناعي فائق
            </span>
          </h1>
          
          <p className="text-muted" style={{ fontWeight: 500, fontSize: '1.35rem', marginBottom: '3rem', lineHeight: 1.8, maxWidth: 800, margin: '0 auto 3rem' }}>
            منصة "شهاداتي" تتيح للمدارس السعودية استيراد بيانات "نور"، وقص وفصل آلاف الشهادات بصيغة PDF ومطابقتها آلياً عبر تقنيات التعرف البصري (OCR) بدقة متناهية.
          </p>
          
          <div className="flex-center" style={{ gap: '1.5rem', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn btn-primary" style={{ padding: '1.25rem 2.5rem', fontSize: '1.25rem', borderRadius: '3rem', boxShadow: '0 10px 25px rgba(37,99,235,0.3)' }}>
              تسجيل مدرسة جديدة <ArrowLeft size={20} style={{ marginRight: '0.5rem' }} />
            </Link>
            <Link href="/admin" className="btn btn-secondary" style={{ padding: '1.25rem 2.5rem', fontSize: '1.25rem', borderRadius: '3rem' }}>
              دخول الإدارة
            </Link>
          </div>
        </section>

        {/* Dashboard Preview / Mockup */}
        <section className="animate-fade-in" style={{ marginTop: '2rem', marginBottom: '6rem', perspective: '1000px', animationDelay: '0.2s' }}>
          <div className="glass-card" style={{ padding: '0.5rem', borderRadius: '1.5rem', boxShadow: 'var(--shadow-xl)', transform: 'rotateX(5deg) translateY(-10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ background: 'var(--background)', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
              {/* Fake Browser Top */}
              <div style={{ background: 'var(--card)', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--card-border)' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
              </div>
              <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'radial-gradient(circle at 50% 0%, rgba(37,99,235,0.05) 0%, transparent 100%)' }}>
                <GraduationCap size={80} style={{ color: 'var(--primary)', opacity: 0.2, margin: '0 auto 1.5rem' }} />
                <h3 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>لوحة تحكم إدارية متكاملة</h3>
                <p className="text-muted" style={{ maxWidth: 500, margin: '0 auto', fontSize: '1.1rem' }}>إحصائيات حية، معالجة ذكية بالذكاء الاصطناعي، وتقارير شاملة لمدرستك في مكان واحد وبواجهة زجاجية عصرية.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={{ marginTop: '6rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 className="heading-2" style={{ fontSize: '2.5rem' }}>لماذا تختار منصة شهاداتي؟</h2>
            <p className="text-muted">نقدم تجربة سلسة تدمج بين التكنولوجيا الحديثة والمتطلبات التعليمية</p>
          </div>

          <div className="grid-3">
            <div className="glass-card" style={{ padding: '3rem 2rem', transition: 'transform 0.3s', ':hover': { transform: 'translateY(-5px)' } } as any}>
              <div style={{ padding: '1.25rem', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '1rem', color: 'var(--primary)', display: 'inline-block', marginBottom: '1.5rem' }}>
                <Zap size={36} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>معالجة فائقة السرعة</h3>
              <p className="text-muted" style={{ lineHeight: 1.7, fontSize: '1.1rem' }}>معالجة عشرات الشهادات في ثوانٍ معدودة. استخراج النصوص وتقسيم الـ PDF وربطها بالطلاب آلياً وبدون تدخل بشري.</p>
            </div>
            
            <div className="glass-card" style={{ padding: '3rem 2rem', borderTop: '4px solid var(--accent)', transition: 'transform 0.3s' }}>
              <div style={{ padding: '1.25rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '1rem', color: 'var(--accent)', display: 'inline-block', marginBottom: '1.5rem' }}>
                <Users size={36} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>تكامل كامل مع "نور"</h3>
              <p className="text-muted" style={{ lineHeight: 1.7, fontSize: '1.1rem' }}>استيراد سلس وسريع لملفات الإكسل المصدرة من نظام نور، مع تنظيم تلقائي لبيانات الطلاب والفصول.</p>
            </div>

            <div className="glass-card" style={{ padding: '3rem 2rem', transition: 'transform 0.3s' }}>
              <div style={{ padding: '1.25rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '1rem', color: '#f59e0b', display: 'inline-block', marginBottom: '1.5rem' }}>
                <Search size={36} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>بوابة موحدة للطلاب</h3>
              <p className="text-muted" style={{ lineHeight: 1.7, fontSize: '1.1rem' }}>رابط خاص واستعلام آمن لكل مدرسة. يدخل الطالب رقم هويته ويحصل على شهادته فوراً بتصميم جذاب.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
