import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = url.searchParams.get("limit") || "10"

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })

    // Get lessons
    const { data, error } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Number.parseInt(limit))

    if (error) {
      console.error("Error fetching lessons:", error)
      return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in get lessons endpoint:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
