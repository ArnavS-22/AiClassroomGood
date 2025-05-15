import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 })
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Get existing submissions
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from("assignment_submissions")
      .select(`
        *,
        student:users(*)
      `)
      .eq("assignment_id", id)

    if (submissionsError) {
      console.error("Error fetching assignment submissions:", submissionsError)
      return NextResponse.json({ error: "Failed to fetch assignment submissions" }, { status: 500 })
    }

    return NextResponse.json(submissions || [])
  } catch (error: any) {
    console.error("Error in assignment submissions API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
