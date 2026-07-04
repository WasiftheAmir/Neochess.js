import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bblhtzpjudskebvqnleu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AQkTX0hDm4PXxT8Ek1R_dA_BUAmmXJC';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
