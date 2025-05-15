import { createClient } from "@supabase/supabase-js"

// For use in middleware.ts and other non-App Router code
export function createNonAppSupabaseClient(cookieHeader?: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        cookie: cookieHeader || "",
      },
    },
  })
}

// Service role client for admin operations
export function createNonAppServiceRoleClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
