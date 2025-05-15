import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const classroomId = searchParams.get("classroomId")
    const teacherId = searchParams.get("teacherId")
    const studentId = searchParams.get("studentId")

    if (!classroomId) {
      return NextResponse.json({ error: "Classroom ID is required" }, { status: 400 })
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createServerClient()

    // If teacherId is provided, verify teacher owns this classroom
    if (teacherId) {
      const { data: classroom, error: classroomError } = await supabaseAdmin
        .from("classrooms")
        .select("*")
        .eq("id", classroomId)
        .eq("teacher_id", teacherId)
        .single()

      if (classroomError) {
        console.error("Error verifying classroom ownership:", classroomError)
        if (classroomError.code === "PGRST116") {
          return NextResponse.json({ error: "Classroom not found or access denied" }, { status: 404 })
        }
        return NextResponse.json({ error: "Failed to verify classroom ownership" }, { status: 500 })
      }
    }

    // If studentId is provided, verify student is in this classroom
    if (studentId) {
      const { data: classroomStudent, error: classroomStudentError } = await supabaseAdmin
        .from("classroom_students")
        .select("*")
        .eq("classroom_id", classroomId)
        .eq("student_id", studentId)
        .single()

      if (classroomStudentError) {
        console.error("Error verifying student classroom membership:", classroomStudentError)
        if (classroomStudentError.code === "PGRST116") {
          return NextResponse.json({ error: "Student is not in this classroom" }, { status: 404 })
        }
        return NextResponse.json({ error: "Failed to verify student classroom membership" }, { status: 500 })
      }
    }

    // Get lessons for this classroom
    let query = supabaseAdmin
      .from("classroom_lessons")
      .select(`
        *,
        lesson:lessons(*)
      `)
      .eq("classroom_id", classroomId)

    // If studentId is provided, only get visible lessons
    if (studentId) {
      query = query.eq("visible", true)
    }

    const { data: classroomLessons, error: lessonsError } = await query

    if (lessonsError) {
      console.error("Error fetching classroom lessons:", lessonsError)
      return NextResponse.json({ error: "Failed to fetch classroom lessons" }, { status: 500 })
    }

    return NextResponse.json(classroomLessons || [])
  } catch (error: any) {
    console.error("Error in get classroom lessons API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
