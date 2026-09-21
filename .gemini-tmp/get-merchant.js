const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('merchants')
    .select('id, business_name')
    .ilike('business_name', '%Vyshnavi%')
    .limit(1)
    .single();
  
  console.log(data || error);
}

test();
