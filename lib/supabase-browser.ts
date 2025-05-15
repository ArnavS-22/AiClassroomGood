import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for the browser
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

// For backward compatibility with existing code
export function getSupabaseBrowserClient() {
  return supabaseBrowser
}

// Service role client for admin operations (browser-safe version)
// Note: This won't actually work in the browser due to security restrictions
export function getSupabaseServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Using anon key instead of service role key in browser
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
