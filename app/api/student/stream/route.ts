import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    console.log("Student stream API called for student ID:", studentId)

    if (!studentId) {
      console.log("Student ID is missing in the request")
      return NextResponse.json([], { status: 200 }) // Return empty array instead of error
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createServerClient()

    // Get all classrooms the student is in
    console.log("Fetching classrooms for student:", studentId)
    const { data: classroomStudents, error: classroomStudentsError } = await supabaseAdmin
      .from("classroom_students")
      .select("classroom_id")
      .eq("student_id", studentId)

    if (classroomStudentsError) {
      console.error("Error fetching student classrooms:", classroomStudentsError)
      // Return empty array instead of error
      return NextResponse.json([], { status: 200 })
    }

    if (!classroomStudents || classroomStudents.length === 0) {
      console.log("Student is not in any classrooms")
      return NextResponse.json([], { status: 200 })
    }

    const classroomIds = classroomStudents.map((cs) => cs.classroom_id)
    console.log("Student is in classrooms:", classroomIds)

    // Use Promise.allSettled to fetch assignments and lessons in parallel
    // and continue even if one of the queries fails
    const [assignmentsResult, lessonsResult] = await Promise.allSettled([
      // Get all assignments from those classrooms
      supabaseAdmin
        .from("assignments")
        .select(`
          id,
          title,
          description,
          due_date,
          created_at,
          classroom_id,
          lesson_id,
          lesson:lessons(id, title, description, file_url),
          classroom:classrooms(id, name)
        `)
        .in("classroom_id", classroomIds)
        .order("created_at", { ascending: false }),

      // Get all visible lessons from those classrooms
      supabaseAdmin
        .from("classroom_lessons")
        .select(`
          id,
          created_at,
          classroom_id,
          lesson_id,
          visible,
          lesson:lessons(id, title, description, file_url),
          classroom:classrooms(id, name)
        `)
        .in("classroom_id", classroomIds)
        .eq("visible", true)
        .order("created_at", { ascending: false }),
    ])

    // Initialize arrays for assignments and lessons
    let assignments = []
    let classroomLessons = []

    // Process assignments result
    if (assignmentsResult.status === "fulfilled") {
      const { data, error } = assignmentsResult.value
      if (error) {
        console.error("Error fetching assignments:", error)
      } else if (data) {
        assignments = data
        console.log(`Fetched ${data.length} assignments`)
      }
    } else {
      console.error("Failed to fetch assignments:", assignmentsResult.reason)
    }

    // Process lessons result
    if (lessonsResult.status === "fulfilled") {
      const { data, error } = lessonsResult.value
      if (error) {
        console.error("Error fetching classroom lessons:", error)
      } else if (data) {
        classroomLessons = data
        console.log(`Fetched ${data.length} classroom lessons`)
      }
    } else {
      console.error("Failed to fetch classroom lessons:", lessonsResult.reason)
    }

    // Safely map assignments and lessons
    const assignmentItems = Array.isArray(assignments)
      ? assignments.map((item) => ({
          ...item,
          type: "assignment",
        }))
      : []

    const lessonItems = Array.isArray(classroomLessons)
      ? classroomLessons.map((item) => ({
          ...item,
          type: "lesson",
        }))
      : []

    // Combine and sort by created_at
    const streamItems = [...assignmentItems, ...lessonItems].sort((a, b) => {
      // Safely parse dates
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    })

    console.log(`Returning ${streamItems.length} stream items`)

    // Always return an array, even if it's empty
    return NextResponse.json(streamItems)
  } catch (error: any) {
    console.error("Error in get student stream API:", error)
    // Return an empty array on error to prevent client-side errors
    return NextResponse.json([], { status: 200 })
  }
}
