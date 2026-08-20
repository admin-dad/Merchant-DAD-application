import { createClient } from '@supabase/supabase-js'

// Server-only client that uses the Supabase SERVICE ROLE key.
// This BYPASSES Row Level Security entirely, so:
//   - never import this into a client component ('use client' file)
//   - only call it from API routes / server actions
//   - always verify the caller is an authorized admin BEFORE using it
//
// Save this file as: lib/supabase/admin.ts
// Requires SUPABASE_SERVICE_ROLE_KEY in your server environment (NOT prefixed
// with NEXT_PUBLIC_ — it must never be sent to the browser). You'll find this
// key in Supabase Dashboard -> Project Settings -> API -> service_role.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
        'Add SUPABASE_SERVICE_ROLE_KEY to your .env (server-only, from Supabase Project Settings > API).'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}