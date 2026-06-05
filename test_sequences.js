const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = `testuser_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  
  console.log(`Signing up temporary user: ${email}...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (signUpError) {
    console.error('Sign up failed:', signUpError.message);
    return;
  }
  
  const user = signUpData.user;
  
  // Log in
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (signInError) {
    console.error('Sign in failed:', signInError.message);
    return;
  }
  
  const session = signInData.session;
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  });
  
  // 1. Test Products sequence
  console.log('Testing Products insert...');
  const { data: pData, error: pError } = await authClient
    .from('products')
    .insert({
      owner_id: user.id,
      title: 'Test Product',
      sku: `SKU-${Date.now()}`
    })
    .select()
    .single();
    
  if (pError) {
    console.error('❌ Products insert failed:', pError.message);
  } else {
    console.log('✅ Products insert succeeded. ID:', pData.id);
    
    // 2. Test Variants sequence (if table exists)
    console.log('Testing Variants insert...');
    const { data: vData, error: vError } = await authClient
      .from('variants')
      .insert({
        owner_id: user.id,
        product_id: pData.id,
        options: { Size: 'Standard' },
        sku: `SKU-VAR-${Date.now()}`,
        price: 100,
        stock: 5
      })
      .select()
      .single();
      
    if (vError) {
      console.error('❌ Variants insert failed:', vError.message);
    } else {
      console.log('✅ Variants insert succeeded. ID:', vData.id);
      
      // 3. Test Orders sequence
      console.log('Testing Orders insert...');
      const { data: oData, error: oError } = await authClient
        .from('orders')
        .insert({
          owner_id: user.id,
          total_amount: 100,
          status: 'completed',
          payment_method: 'cash'
        })
        .select()
        .single();
        
      if (oError) {
        console.error('❌ Orders insert failed:', oError.message);
      } else {
        console.log('✅ Orders insert succeeded. ID:', oData.id);
        
        // 4. Test Order Items sequence
        console.log('Testing Order Items insert...');
        const { data: oiData, error: oiError } = await authClient
          .from('order_items')
          .insert({
            owner_id: user.id,
            order_id: oData.id,
            variant_id: vData.id,
            quantity: 1,
            price_at_sale: 100
          })
          .select()
          .single();
          
        if (oiError) {
          console.error('❌ Order Items insert failed:', oiError.message);
        } else {
          console.log('✅ Order Items insert succeeded. ID:', oiData.id);
        }
      }
    }
  }

  // 5. Test store_settings CRUD
  console.log('Testing store_settings select...');
  const { data: ssData, error: ssError } = await authClient
    .from('store_settings')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();
    
  if (ssError) {
    console.error('❌ store_settings select failed:', ssError.message);
  } else {
    console.log('✅ store_settings select succeeded. Row exists:', !!ssData);
    
    if (!ssData) {
      console.log('Testing store_settings insert...');
      const { data: ssInsertData, error: ssInsertError } = await authClient
        .from('store_settings')
        .insert({
          id: 999999,
          owner_id: user.id,
          store_name: 'Test Store',
          email: user.email,
          phone: '123456789'
        })
        .select()
        .single();
        
      if (ssInsertError) {
        console.error('❌ store_settings insert failed:', ssInsertError.message);
      } else {
        console.log('✅ store_settings insert succeeded. ID:', ssInsertData.id);
        
        console.log('Testing store_settings update...');
        const { error: ssUpdateError } = await authClient
          .from('store_settings')
          .update({
            store_name: 'Updated Store Name'
          })
          .eq('owner_id', user.id);
          
        if (ssUpdateError) {
          console.error('❌ store_settings update failed:', ssUpdateError.message);
        } else {
          console.log('✅ store_settings update succeeded.');
        }
      }
    } else {
      console.log('Testing store_settings update...');
      const { error: ssUpdateError } = await authClient
        .from('store_settings')
        .update({
          store_name: 'Updated Store Name'
        })
        .eq('owner_id', user.id);
        
      if (ssUpdateError) {
        console.error('❌ store_settings update failed:', ssUpdateError.message);
      } else {
        console.log('✅ store_settings update succeeded.');
      }
    }
  }

  // 6. Test updating a non-existent store_settings row
  console.log('Testing update on non-existent store_settings row...');
  const { data: nonExistentData, error: nonExistentError } = await authClient
    .from('store_settings')
    .update({
      store_name: 'Non-existent Store'
    })
    .eq('owner_id', '00000000-0000-0000-0000-000000000000');
    
  if (nonExistentError) {
    console.log('❌ Update non-existent failed:', nonExistentError.message);
  } else {
    console.log('✅ Update non-existent succeeded (no rows changed).');
  }
}

run().catch(console.error);
