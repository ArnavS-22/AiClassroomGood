import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function middleware(request: NextRequest) {
  // Skip middleware for auth-related routes
  if (
    request.nextUrl.pathname.startsWith("/auth/callback") ||
    request.nextUrl.pathname.startsWith("/set-password") ||
    request.nextUrl.pathname.startsWith("/reset-password") ||
    request.nextUrl.pathname.startsWith("/update-password")
  ) {
    return NextResponse.next()
  }

  // Create a Supabase client configured to use cookies
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    },
  })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session and trying to access protected routes
  if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
    const redirectUrl = new URL("/login", request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If session exists, check role-based access
  if (session) {
    // Get user role from database
    const { data: userData, error } = await supabase.from("users").select("role").eq("id", session.user.id).single()

    if (error || !userData) {
      // If error fetching role, redirect to login
      const redirectUrl = new URL("/login", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Check teacher routes
    if (request.nextUrl.pathname.startsWith("/dashboard/teacher") && userData.role !== "teacher") {
      const redirectUrl = new URL("/dashboard/student", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Check student routes
    if (request.nextUrl.pathname.startsWith("/dashboard/student") && userData.role !== "student") {
      const redirectUrl = new URL("/dashboard/teacher", request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/chat/:path*", "/update-password", "/set-password"],
}
