import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const classroomId = searchParams.get("classroomId")
  const studentId = searchParams.get("studentId")

  if (!classroomId || !studentId) {
    return NextResponse.json({ error: "Classroom ID and Student ID are required" }, { status: 400 })
  }

  try {
    console.log(`Fetching assignments for classroom ${classroomId} and student ${studentId}`)

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Verify student is enrolled in this classroom
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from("classroom_students")
      .select("*")
      .eq("classroom_id", classroomId)
      .eq("student_id", studentId)
      .single()

    if (enrollmentError) {
      console.error("Error verifying enrollment:", enrollmentError)
      return NextResponse.json({ error: "Failed to verify enrollment" }, { status: 500 })
    }

    if (!enrollment) {
      console.log(`Student ${studentId} is not enrolled in classroom ${classroomId}`)
      return NextResponse.json({ error: "Student is not enrolled in this classroom" }, { status: 403 })
    }

    // Fetch assignments for this classroom
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from("assignments")
      .select(`
        id, title, description, due_date, created_at, updated_at,
        lesson:lessons(id, title, description, file_url)
      `)
      .eq("classroom_id", classroomId)
      .order("due_date", { ascending: true, nullsLast: true })

    if (assignmentsError) {
      console.error("Error fetching assignments:", assignmentsError)
      return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
    }

    // Get submission status for each assignment
    const assignmentsWithStatus = await Promise.all(
      (assignments || []).map(async (assignment) => {
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

    console.log(`Successfully fetched ${assignmentsWithStatus.length} assignments for classroom ${classroomId}`)
    return NextResponse.json(assignmentsWithStatus || [])
  } catch (error) {
    console.error("Error in classroom assignments API route:", error)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}
