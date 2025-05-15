import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get("teacherId")

    if (!id) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 })
    }

    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 })
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Fetch assignment with related data
    const { data, error } = await supabaseAdmin
      .from("assignments")
      .select(`
        *,
        classroom:classrooms(*),
        lesson:lessons(*)
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching assignment:", error)
      return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Verify teacher owns this classroom
    if (data.classroom.teacher_id !== teacherId) {
      return NextResponse.json({ error: "You don't have permission to view this assignment" }, { status: 403 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error in assignment API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
