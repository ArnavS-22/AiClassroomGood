import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get("teacherId")

    if (!id) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 })
    }

    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 })
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Verify the assignment exists and belongs to the teacher
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from("assignments")
      .select(`
        *,
        classroom:classrooms(*)
      `)
      .eq("id", id)
      .single()

    if (assignmentError) {
      console.error("Error fetching assignment:", assignmentError)
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    if (assignment.classroom.teacher_id !== teacherId) {
      return NextResponse.json({ error: "You don't have permission to view these quiz results" }, { status: 403 })
    }

    // Get quiz results from assignment_submissions table with student information
    const { data: quizResults, error: quizResultsError } = await supabaseAdmin
      .from("assignment_submissions")
      .select(`
        *,
        student:student_id(id, email, full_name)
      `)
      .eq("assignment_id", id)
      .order("submitted_at", { ascending: false })

    if (quizResultsError) {
      console.error("Error fetching quiz results:", quizResultsError)
      return NextResponse.json({ error: "Failed to fetch quiz results: " + quizResultsError.message }, { status: 500 })
    }

    // Format the results for the frontend
    const formattedResults = quizResults.map((result) => ({
      id: result.id,
      student_id: result.student_id,
      student_name: result.student?.full_name || result.student?.email || "Unknown Student",
      assignment_id: result.assignment_id,
      score: result.grade ? Number.parseInt(result.grade) : 0,
      completed_at: result.submitted_at,
      answers: result.answers || [],
    }))

    return NextResponse.json(formattedResults)
  } catch (error: any) {
    console.error("Error in quiz results API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
