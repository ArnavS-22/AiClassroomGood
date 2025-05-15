import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get("studentId")

  if (!studentId) {
    return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
  }

  try {
    console.log("Fetching assignments for student:", studentId)

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Get classrooms that the student is enrolled in
    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
      .from("classroom_students")
      .select("classroom_id")
      .eq("student_id", studentId)

    if (enrollmentsError) {
      console.error("Error fetching enrollments:", enrollmentsError)
      throw enrollmentsError
    }

    if (!enrollments || enrollments.length === 0) {
      console.log("No enrollments found for student:", studentId)
      return NextResponse.json([])
    }

    const classroomIds = enrollments.map((enrollment) => enrollment.classroom_id)
    console.log(`Found ${classroomIds.length} classroom enrollments for student ${studentId}`)

    // Get assignments for these classrooms
    const { data: assignmentsData, error: assignmentsError } = await supabaseAdmin
      .from("assignments")
      .select(`
        id, title, description, due_date, classroom_id, lesson_id, created_at,
        classroom:classrooms(name),
        lesson:lessons(title)
      `)
      .in("classroom_id", classroomIds)
      .order("due_date", { ascending: true })

    if (assignmentsError) {
      console.error("Error fetching assignments:", assignmentsError)
      throw assignmentsError
    }

    // Get submission status for each assignment
    const assignmentsWithStatus = await Promise.all(
      (assignmentsData || []).map(async (assignment) => {
        const { data: submission, error: submissionError } = await supabaseAdmin
          .from("assignment_submissions")
          .select("status")
          .eq("assignment_id", assignment.id)
          .eq("student_id", studentId)
          .single()

        if (submissionError && submissionError.code !== "PGRST116") {
          console.error("Error fetching submission:", submissionError)
        }

        return {
          ...assignment,
          status: submission?.status || "not_started",
        }
      }),
    )

    console.log(`Successfully fetched ${assignmentsWithStatus.length} assignments for student ${studentId}`)
    return NextResponse.json(assignmentsWithStatus || [])
  } catch (error) {
    console.error("Error in student-assignments API route:", error)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}
