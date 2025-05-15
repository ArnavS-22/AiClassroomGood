import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      console.error("Student ID is required but was not provided")
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    console.log(`Fetching lessons for student ${studentId}`)

    try {
      // Create a Supabase client with the service role key to bypass RLS
      const supabaseAdmin = createServerClient()

      // First check if the student exists
      const { data: student, error: studentError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", studentId)
        .single()

      if (studentError) {
        console.error(`Error verifying student ${studentId}:`, studentError)
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }

      // Get all classrooms the student is in
      const { data: classroomStudents, error: classroomStudentsError } = await supabaseAdmin
        .from("classroom_students")
        .select("classroom_id")
        .eq("student_id", studentId)

      if (classroomStudentsError) {
        console.error(`Error fetching classrooms for student ${studentId}:`, classroomStudentsError)
        return NextResponse.json({ error: "Failed to fetch student classrooms" }, { status: 500 })
      }

      if (!classroomStudents || classroomStudents.length === 0) {
        console.log(`Student ${studentId} is not in any classrooms`)
        return NextResponse.json([])
      }

      // Get all visible lessons from those classrooms
      const classroomIds = classroomStudents.map((cs) => cs.classroom_id)
      console.log(`Student ${studentId} is in ${classroomIds.length} classrooms`)

      // Use a simpler query to reduce the chance of errors
      const { data: classroomLessons, error: lessonsError } = await supabaseAdmin
        .from("classroom_lessons")
        .select(`
          id, 
          visible,
          classroom_id,
          lesson_id,
          lesson:lessons(id, title, description, file_url),
          classroom:classrooms(id, name)
        `)
        .in("classroom_id", classroomIds)
        .eq("visible", true)

      if (lessonsError) {
        console.error(`Error fetching lessons for student ${studentId}:`, lessonsError)
        return NextResponse.json({ error: "Failed to fetch classroom lessons" }, { status: 500 })
      }

      // Filter out any null lessons or classrooms
      const validLessons = (classroomLessons || []).filter((item) => item.lesson && item.classroom)

      console.log(`Fetched ${validLessons.length} valid lessons for student ${studentId}`)
      return NextResponse.json(validLessons)
    } catch (dbError: any) {
      console.error(`Database error for student ${studentId}:`, dbError)
      return NextResponse.json(
        { error: `Database error: ${dbError.message || "Unknown database error"}` },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Unexpected error in get student lessons API:", error)
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error.message || "Unknown error"}` },
      { status: 500 },
    )
  }
}
