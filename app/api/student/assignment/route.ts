import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const assignmentId = searchParams.get("assignmentId")
  const studentId = searchParams.get("studentId")

  if (!assignmentId || !studentId) {
    return NextResponse.json({ error: "Assignment ID and Student ID are required" }, { status: 400 })
  }

  try {
    console.log(`Fetching assignment details for assignment ${assignmentId} and student ${studentId}`)

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Fetch assignment details with related data
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from("assignments")
      .select(`
        *,
        classroom:classrooms(*),
        lesson:lessons(*)
      `)
      .eq("id", assignmentId)
      .single()

    if (assignmentError) {
      console.error("Error fetching assignment:", assignmentError)
      return NextResponse.json({ error: "Failed to fetch assignment details" }, { status: 500 })
    }

    if (!assignment) {
      console.log(`Assignment ${assignmentId} not found`)
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Verify student is enrolled in this classroom
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from("classroom_students")
      .select("*")
      .eq("classroom_id", assignment.classroom_id)
      .eq("student_id", studentId)
      .single()

    if (enrollmentError) {
      console.error("Error verifying enrollment:", enrollmentError)
      if (enrollmentError.code === "PGRST116") {
        return NextResponse.json({ error: "Student is not enrolled in this classroom" }, { status: 403 })
      }
      return NextResponse.json({ error: "Failed to verify enrollment" }, { status: 500 })
    }

    // Check if student has already submitted this assignment
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from("assignment_submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .maybeSingle()

    if (submissionError && submissionError.code !== "PGRST116") {
      console.error("Error fetching submission:", submissionError)
      return NextResponse.json({ error: "Failed to fetch submission data" }, { status: 500 })
    }

    console.log(`Successfully fetched assignment details for ${assignmentId}`)
    return NextResponse.json({
      assignment,
      submission: submission || null,
    })
  } catch (error) {
    console.error("Error in assignment details API route:", error)
    return NextResponse.json({ error: "Failed to fetch assignment data" }, { status: 500 })
  }
}
