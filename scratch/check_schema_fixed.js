const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://djnlwcovugszebsmagpo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbmx3Y292dWdzemVic21hZ3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MTQ0MjIsImV4cCI6MjA5MjI5MDQyMn0.rxC9hsv2gp3OYgEp4yQyj7tpBxMn6UBjhHG_qoafg-c';
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
