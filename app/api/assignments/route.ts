import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get("teacherId")

  if (!teacherId) {
    return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 })
  }

  try {
    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Since assignments table doesn't have teacher_id, we need to join with classrooms
    // and filter by the teacher_id in the classrooms table
    const { data, error } = await supabaseAdmin
      .from("assignments")
      .select(`
        id, title, description, due_date, classroom_id, lesson_id, created_at,
        classroom:classrooms(id, name, teacher_id),
        lesson:lessons(title)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching assignments:", error)
      throw error
    }

    // Filter assignments to only include those from classrooms where the teacher is the owner
    const filteredAssignments = data.filter(
      (assignment) => assignment.classroom && assignment.classroom.teacher_id === teacherId,
    )

    return NextResponse.json(filteredAssignments || [])
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}
