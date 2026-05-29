import pkg from '@next/env';
const { loadEnvConfig } = pkg;
import { createClient } from '@supabase/supabase-js';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching packages...");
  const { data, error } = await supabase.from('subscription_packages').select('*');
  
  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Packages Found:", data.length);
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
