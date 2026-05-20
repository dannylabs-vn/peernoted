const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_ANON_KEY not set in .env');
  process.exit(1);
}

// Supabase URL in .env points to /rest/v1/ — strip that suffix so the JS SDK can
// construct its own endpoints.
const baseUrl = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

const supabase = createClient(baseUrl, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

// Convert Postgres row → API-shape object. Frontend expects `_id` (legacy Mongo
// convention) so we mirror `id` into `_id` and ISO-format timestamps the same
// way Mongoose did.
function toApi(row) {
  if (!row) return row;
  const out = { ...row, _id: row.id };
  if (row.created_at) out.createdAt = row.created_at;
  if (row.updated_at) out.updatedAt = row.updated_at;
  return out;
}

function toApiList(rows) {
  return (rows || []).map(toApi);
}

async function healthcheck() {
  const { error } = await supabase.from('folders').select('id', { count: 'exact', head: true });
  if (error) throw new Error(`Supabase healthcheck failed: ${error.message}`);
}

module.exports = { supabase, toApi, toApiList, healthcheck };
