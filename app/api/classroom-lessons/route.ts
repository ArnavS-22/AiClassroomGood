import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const classroomId = searchParams.get("classroomId")
    const teacherId = searchParams.get("teacherId")
    const studentId = searchParams.get("studentId")

    if (!classroomId) {
      return NextResponse.json({ error: "Classroom ID is required" }, { status: 400 })
    }

    console.log(
      `Fetching classroom lessons for classroom ${classroomId}, teacher: ${teacherId || "none"}, student: ${studentId || "none"}`,
    )

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createServerClient()

    // If teacherId is provided, verify teacher owns this classroom
    if (teacherId) {
      try {
        const { data: classroom, error: classroomError } = await supabaseAdmin
          .from("classrooms")
          .select("*")
          .eq("id", classroomId)
          .eq("teacher_id", teacherId)
          .maybeSingle()

        if (classroomError) {
          console.error("Error verifying classroom ownership:", classroomError)
          return NextResponse.json({ error: "Failed to verify classroom ownership" }, { status: 500 })
        }

        if (!classroom) {
          console.log(`Teacher ${teacherId} does not own classroom ${classroomId}`)
          return NextResponse.json({ error: "Classroom not found or access denied" }, { status: 404 })
        }
      } catch (err) {
        console.error("Exception verifying classroom ownership:", err)
        return NextResponse.json({ error: "Exception verifying classroom ownership" }, { status: 500 })
      }
    }

    // If studentId is provided, verify student is in this classroom
    if (studentId) {
      try {
        console.log(`Verifying student ${studentId} membership in classroom ${classroomId}`)

        const { data: classroomStudents, error: classroomStudentError } = await supabaseAdmin
          .from("classroom_students")
          .select("*")
          .eq("classroom_id", classroomId)
          .eq("student_id", studentId)

        if (classroomStudentError) {
          console.error("Error querying student classroom membership:", classroomStudentError)
          return NextResponse.json({ error: "Failed to verify student classroom membership" }, { status: 500 })
        }

        // Check if any rows were returned
        if (!classroomStudents || classroomStudents.length === 0) {
          console.log(`Student ${studentId} is not a member of classroom ${classroomId}`)
          return NextResponse.json({ error: "Student is not in this classroom" }, { status: 404 })
        }

        console.log(`Verified student ${studentId} is a member of classroom ${classroomId}`)
      } catch (err) {
        console.error("Exception verifying student classroom membership:", err)
        return NextResponse.json({ error: "Exception verifying student classroom membership" }, { status: 500 })
      }
    }

    // Get lessons for this classroom
    try {
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

      console.log(`Successfully fetched ${classroomLessons?.length || 0} lessons for classroom ${classroomId}`)
      return NextResponse.json(classroomLessons || [])
    } catch (err) {
      console.error("Exception fetching classroom lessons:", err)
      return NextResponse.json({ error: "Exception fetching classroom lessons" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error in get classroom lessons API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
