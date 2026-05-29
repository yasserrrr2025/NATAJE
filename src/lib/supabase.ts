import { createClient } from '@supabase/supabase-js';
import type { CertificateRecord, SchoolRecord, StudentRecord } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type School = SchoolRecord;
export type Student = StudentRecord;
export type Certificate = CertificateRecord;
