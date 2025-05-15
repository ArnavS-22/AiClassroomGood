import { createClient } from "@supabase/supabase-js"

// This function should ONLY be used in Server Components or API Routes
export function createServerSupabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: false,
    },
  })
}

// Re-export with the original name for backward compatibility
export const createServerClient = createServerSupabaseClient

// Service role client for admin operations (server-side)
export function createServiceRoleSupabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
