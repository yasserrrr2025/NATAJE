-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto" with schema extensions;

-- 1. Schools (Tenants)
create table public.schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  ministerial_number text unique not null,
  is_portal_active boolean default true,
  is_active boolean default true, -- Super Admin override to deactivate school completely
  subscription_end_date timestamp with time zone,
  subscription_plan text default 'TRIAL',
  contact_email text, -- For super admin to know who registered
  password text,
  whatsapp_phone text,
  notes text,
  portal_welcome_message text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1.5 Subscription Packages (Dynamic Pricing)
create table public.subscription_packages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price numeric not null,
  duration_months integer not null default 1,
  features jsonb default '[]'::jsonb, -- Array of strings (features)
  is_active boolean default true,
  is_popular boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Users (Linked to Supabase Auth and Schools)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  name text not null,
  role text not null check (role in ('ADMIN', 'STUDENT_AFFAIRS', 'VIEWER')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Students (Imported from Noor)
create table public.students (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references public.schools(id) on delete cascade not null,
  national_id text not null,
  name text not null,
  grade_level text,
  classroom text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(school_id, national_id)
);

-- 4. Certificates (PDF Documents)
create table public.certificates (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references public.schools(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade,
  extracted_national_id text, -- What the OCR found
  file_url text not null, -- S3 / Supabase Storage path
  page_number integer not null,
  status text not null check (status in ('MATCHED', 'UNMATCHED', 'MANUAL_REVIEW_NEEDED')),
  ocr_confidence numeric,
  academic_year text,
  term text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Upload Batches (Tracking PDF uploads)
create table public.upload_batches (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references public.schools(id) on delete cascade not null,
  uploaded_by uuid references public.profiles(id),
  original_file_name text not null,
  total_pages integer,
  matched_count integer default 0,
  unmatched_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROW LEVEL SECURITY (RLS)
alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.certificates enable row level security;
alter table public.upload_batches enable row level security;

-- Policies
-- Schools: Users can only view their own school
create policy "Users can view own school" on public.schools
  for select using (id in (select school_id from public.profiles where id = auth.uid()));

-- Profiles: Users can view profiles in their school
create policy "Users can view profiles in own school" on public.profiles
  for select using (school_id in (select school_id from public.profiles where id = auth.uid()));

-- Students: Tenant Isolation
create policy "Tenant Isolation for Students" on public.students
  for all using (school_id in (select school_id from public.profiles where id = auth.uid()));

-- Certificates: Tenant Isolation
create policy "Tenant Isolation for Certificates" on public.certificates
  for all using (school_id in (select school_id from public.profiles where id = auth.uid()));

-- Upload Batches: Tenant Isolation
create policy "Tenant Isolation for Uploads" on public.upload_batches
  for all using (school_id in (select school_id from public.profiles where id = auth.uid()));

-- Portal Access Policy (Public read for matched certificates using National ID)
-- This allows the portal to query students and certificates WITHOUT being logged in.
-- In production, consider using Edge Functions with a secure token to prevent scraping.
create policy "Public Portal access to Students" on public.students
  for select using (true); -- Filtered down at API level by exact national_id match

create policy "Public Portal access to Certificates" on public.certificates
  for select using (status = 'MATCHED'); -- Filtered down at API level by student_id

-- 6. Coupons (Discount Offers)
create table public.coupons (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  discount_percentage numeric not null check (discount_percentage > 0 and discount_percentage <= 100),
  max_uses integer,
  used_count integer default 0,
  expires_at timestamp with time zone,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Subscription Payments / History
create table public.subscription_payments (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references public.schools(id) on delete cascade not null,
  package_id uuid references public.subscription_packages(id),
  amount_paid numeric not null,
  coupon_id uuid references public.coupons(id),
  payment_status text not null check (payment_status in ('PAID', 'PENDING', 'FAILED', 'REFUNDED')),
  payment_method text check (payment_method in ('CREDIT_CARD', 'BANK_TRANSFER', 'MADA', 'APPLE_PAY')),
  reference_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7.5 Platform Settings
create table if not exists public.platform_settings (
  id text primary key default 'primary',
  platform_name text not null default 'NTAJE',
  support_phone text,
  support_email text,
  whatsapp_template text not null default 'مرحباً {school_name}، تم إنشاء حساب مدرستكم في منصة NTAJE. رابط الدخول: {login_url} البريد: {email} كلمة المرور: {password}',
  invoice_terms text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (id = 'primary')
);

-- 8. Central platform admin vault
create table if not exists public.platform_admin_credentials (
  id text primary key default 'primary',
  pin_hash text not null,
  is_active boolean not null default true,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (id = 'primary')
);

alter table public.platform_admin_credentials enable row level security;

create policy "No direct access to central admin vault"
  on public.platform_admin_credentials
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.verify_platform_admin_pin(input_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
begin
  select pin_hash
    into stored_hash
  from public.platform_admin_credentials
  where id = 'primary'
    and is_active = true;

  if stored_hash is null then
    return false;
  end if;

  return stored_hash = extensions.crypt(input_pin, stored_hash);
end;
$$;

revoke all on table public.platform_admin_credentials from anon, authenticated;
grant execute on function public.verify_platform_admin_pin(text) to anon, authenticated;

create index if not exists idx_profiles_school_id on public.profiles(school_id);
create index if not exists idx_students_school_id on public.students(school_id);
create index if not exists idx_certificates_school_id on public.certificates(school_id);
create index if not exists idx_certificates_student_id on public.certificates(student_id);
create index if not exists idx_upload_batches_school_id on public.upload_batches(school_id);
create index if not exists idx_upload_batches_uploaded_by on public.upload_batches(uploaded_by);
create index if not exists idx_subscription_payments_school_id on public.subscription_payments(school_id);
create index if not exists idx_subscription_payments_package_id on public.subscription_payments(package_id);
create index if not exists idx_subscription_payments_coupon_id on public.subscription_payments(coupon_id);

-- 9. Certificate PDF storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates', 'certificates', true, 52428800, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public read certificate files"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'certificates');

create policy "Public upload certificate files"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'certificates');

create policy "Public update certificate files"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'certificates')
  with check (bucket_id = 'certificates');

create policy "Public delete certificate files"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'certificates');

-- Run this once on the target database to seed the initial PIN:
-- insert into public.platform_admin_credentials (id, pin_hash, is_active)
-- values ('primary', extensions.crypt('<CENTRAL_ADMIN_PIN>', extensions.gen_salt('bf')), true)
-- on conflict (id) do update
-- set pin_hash = excluded.pin_hash,
--     is_active = true,
--     updated_at = timezone('utc'::text, now());
