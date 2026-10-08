import { createClient } from '@supabase/supabase-js';

// 추후 가입할 Supabase 프로젝트의 환경변수를 넣을 자리다. 일단은 구조만 잡아둔다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'SUPABASE_URL_입력예정';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'SUPABASE_ANON_KEY_입력예정';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);