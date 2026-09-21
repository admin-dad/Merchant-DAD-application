const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  'https://fmboiffstgitlgwrdben.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYm9pZmZzdGdpdGxnd3JkYmVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjEwMTIyNiwiZXhwIjoyMTAxNjc3MjI2fQ.jjgOE8ndQ6ycgVfJnduhwnVC5JKQq1D_VaEhZjTzPLk'
);

async function test() {
  console.log('Fetching campaigns...');
  const { data: camps, error: err1 } = await supabaseAdmin.from('campaigns').select('id, name').limit(3);
  console.log('Campaigns:', camps, err1);

  if (camps && camps.length > 0) {
    const cid = camps[0].id;
    console.log('Attempting to delete:', cid);
    
    // First clear dependencies
    const r1 = await supabaseAdmin.from('qr_scans').delete().eq('campaign_id', cid);
    console.log('qr_scans deleted:', r1.error);
    
    const r2 = await supabaseAdmin.from('merchant_scratch_cards').delete().eq('campaign_id', cid);
    console.log('merchant_scratch_cards deleted:', r2.error);

    const { data: delData, error: err2 } = await supabaseAdmin.from('campaigns').delete().eq('id', cid).select();
    console.log('Delete result:', delData, err2);
  }
}
test();
