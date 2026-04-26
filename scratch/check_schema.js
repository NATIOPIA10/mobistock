const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
  const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Columns:', Object.keys(data));
}

checkColumn();
