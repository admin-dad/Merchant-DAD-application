const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('merchant_scratch_cards').select('id, campaign_id, status').order('created_at', { ascending: false }).limit(5);
  console.log("Recent Merchant Cards:", data);
  const { data: cData } = await supabase.from('campaigns').select('id, name, type').eq('type', 'merchant').order('created_at', { ascending: false }).limit(2);
  console.log("Recent Merchant Campaigns:", cData);
}
run();
