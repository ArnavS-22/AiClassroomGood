import { NextResponse, type NextRequest } from "next/server"
import { createNonAppSupabaseClient } from "@/lib/supabase-non-app"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const type = requestUrl.searchParams.get("type")

  console.log("Auth callback received:", { code: code ? "exists" : "missing", type })

  // If there's no code, we can't do anything
  if (!code) {
    console.error("No code provided in auth callback")
    return NextResponse.redirect(`${requestUrl.origin}/login?error=no_code`)
  }

  try {
    // Create a Supabase client with the request cookies
    const supabase = createNonAppSupabaseClient(request.headers.get("cookie") || "")

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Error exchanging code for session:", error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_error`)
    }

    // Redirect based on the type of auth flow
    if (type === "recovery") {
      // For password reset, redirect to the update password page
      return NextResponse.redirect(`${requestUrl.origin}/update-password`)
    }

    // For other auth flows, redirect to the appropriate dashboard
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${requestUrl.origin}/login`)
    }

    // Get user role
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userData?.role === "teacher") {
      return NextResponse.redirect(`${requestUrl.origin}/dashboard/teacher`)
    } else if (userData?.role === "student") {
      return NextResponse.redirect(`${requestUrl.origin}/dashboard/student`)
    } else {
      return NextResponse.redirect(`${requestUrl.origin}/login`)
    }
  } catch (error) {
    console.error("Unexpected error in auth callback:", error)
    return NextResponse.redirect(`${requestUrl.origin}/login?error=unexpected`)
  }
}
