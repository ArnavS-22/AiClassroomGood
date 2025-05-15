import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "Classroom ID is required" }, { status: 400 })
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createServerClient()

    // Get the user ID from the request headers or query params
    const url = new URL(request.url)
    const teacherId = url.searchParams.get("teacherId")

    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 })
    }

    // Verify teacher owns this classroom
    const { data: classroom, error: classroomError } = await supabaseAdmin
      .from("classrooms")
      .select("*")
      .eq("id", id)
      .eq("teacher_id", teacherId)
      .single()

    if (classroomError) {
      console.error("Error fetching classroom:", classroomError)
      if (classroomError.code === "PGRST116") {
        return NextResponse.json({ error: "Classroom not found or access denied" }, { status: 404 })
      }
      return NextResponse.json({ error: "Failed to fetch classroom" }, { status: 500 })
    }

    // Fetch assignments for this classroom
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from("assignments")
      .select(`
        *,
        lesson:lessons(*)
      `)
      .eq("classroom_id", id)
      .order("created_at", { ascending: false })

    if (assignmentsError) {
      console.error("Error fetching assignments:", assignmentsError)
      return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
    }

    // Fetch lessons for this teacher
    const { data: lessons, error: lessonsError } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })

    if (lessonsError) {
      console.error("Error fetching lessons:", lessonsError)
      return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 })
    }

    return NextResponse.json({
      classroom,
      assignments: assignments || [],
      lessons: lessons || [],
    })
  } catch (error: any) {
    console.error("Error in classroom assignments API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
