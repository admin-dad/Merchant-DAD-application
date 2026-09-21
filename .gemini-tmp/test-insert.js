const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  console.log("Testing insert into qr_scans as anon...");
  const { data, error } = await supabase
    .from('qr_scans')
    .insert([
      {
        merchant_id: '76a08c1f-a87e-4062-b37d-01c7a86b8e50',
        customer_name: 'Test Dev',
        customer_phone: '8770543780',
        status: 'Pending',
        campaign_id: null
      }
    ])
    .select('id');
  
  console.log("Error:", error);
}

test();
