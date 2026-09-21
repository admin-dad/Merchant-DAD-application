const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://fmboiffstgitlgwrdben.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYm9pZmZzdGdpdGxnd3JkYmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMDEyMjYsImV4cCI6MjEwMTY3NzIyNn0.j6c7EWy8PWzgsNbx6m8-3LNu6z9NY1bEt-U--ET47yw'
);

async function test() {
  const { data: camps, error: err1 } = await supabase.from('campaigns').select('id, name').limit(3);
  console.log('Campaigns:', camps, err1);

  if (camps && camps.length > 0) {
    const cid = camps[0].id;
    console.log('Attempting to delete:', cid);
    const { data: delData, error: err2 } = await supabase.from('campaigns').delete().eq('id', cid).select();
    console.log('Delete result:', delData, err2);
  }
}
test();
