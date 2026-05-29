import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import { createClient } from '@supabase/supabase-js';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Seeding packages...");
  const packages = [
    {
      name: 'الباقة الأساسية',
      description: 'مناسبة للمدارس الصغيرة',
      price: 499,
      duration_months: 4,
      features: ["حتى 500 طالب", "معالجة بالذكاء الاصطناعي", "بوابة استعلام مجانية", "دعم فني عبر البريد"],
      is_popular: false
    },
    {
      name: 'الباقة المتقدمة',
      description: 'مناسبة للمدارس المتوسطة والكبيرة',
      price: 899,
      duration_months: 4,
      features: ["عدد لا محدود من الطلاب", "أولوية في سرعة المعالجة", "تصدير تقارير الإكسل", "دعم فني مباشر 24/7"],
      is_popular: true
    },
    {
      name: 'باقة المجمعات التعليمية',
      description: 'للمدارس الأهلية الكبرى (تواصل معنا)',
      price: 2499,
      duration_months: 12,
      features: ["إدارة أكثر من 5 فروع بحساب واحد", "دومين مخصص", "ربط برمجي API مع أنظمتكم", "مدير حساب مخصص"],
      is_popular: false
    }
  ];

  const { data, error } = await supabase.from('subscription_packages').insert(packages).select();
  
  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Packages Seeded successfully:", data.length);
  }
}

run();
