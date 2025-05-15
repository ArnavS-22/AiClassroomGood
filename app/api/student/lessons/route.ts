import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createServerClient()

    // Get all classrooms the student is in
    const { data: classroomStudents, error: classroomStudentsError } = await supabaseAdmin
      .from("classroom_students")
      .select("classroom_id")
      .eq("student_id", studentId)

    if (classroomStudentsError) {
      console.error("Error fetching student classrooms:", classroomStudentsError)
      return NextResponse.json({ error: "Failed to fetch student classrooms" }, { status: 500 })
    }

    if (!classroomStudents || classroomStudents.length === 0) {
      return NextResponse.json([])
    }

    // Get all visible lessons from those classrooms
    const classroomIds = classroomStudents.map((cs) => cs.classroom_id)
    const { data: classroomLessons, error: lessonsError } = await supabaseAdmin
      .from("classroom_lessons")
      .select(`
        *,
        lesson:lessons(*),
        classroom:classrooms(id, name)
      `)
      .in("classroom_id", classroomIds)
      .eq("visible", true)

    if (lessonsError) {
      console.error("Error fetching classroom lessons:", lessonsError)
      return NextResponse.json({ error: "Failed to fetch classroom lessons" }, { status: 500 })
    }

    return NextResponse.json(classroomLessons || [])
  } catch (error: any) {
    console.error("Error in get student lessons API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
