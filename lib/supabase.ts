// This file is for backward compatibility with existing code
// It re-exports functions from the new files

import { supabaseBrowser, getSupabaseBrowserClient as getBrowserClient } from "./supabase-browser"
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "./supabase-server"

// Re-export the functions with the original names
export const getSupabaseBrowserClient = getBrowserClient

// Re-export the createServerClient function
export const createServerClient = createServerSupabaseClient

// Re-export the service role client
export const getSupabaseServiceRoleClient = createServiceRoleSupabaseClient

// Export the browser client directly
export const supabase = supabaseBrowser
