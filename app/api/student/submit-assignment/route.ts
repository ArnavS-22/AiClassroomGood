import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { assignmentId, studentId, notes, fileUrl } = await request.json()

    if (!assignmentId || !studentId || !fileUrl) {
      return NextResponse.json({ error: "Assignment ID, student ID, and file URL are required" }, { status: 400 })
    }

    console.log(`Submitting assignment ${assignmentId} for student ${studentId}`)

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Verify the assignment exists
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from("assignments")
      .select("classroom_id")
      .eq("id", assignmentId)
      .single()

    if (assignmentError) {
      console.error("Error verifying assignment:", assignmentError)
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
    const { data: existingSubmission, error: submissionError } = await supabaseAdmin
      .from("assignment_submissions")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .maybeSingle()

    if (submissionError && submissionError.code !== "PGRST116") {
      console.error("Error checking existing submission:", submissionError)
      return NextResponse.json({ error: "Failed to check existing submission" }, { status: 500 })
    }

    // Submission data
    const submissionData = {
      assignment_id: assignmentId,
      student_id: studentId,
      status: "completed",
      notes: notes || null,
      file_url: fileUrl,
      submitted_at: new Date().toISOString(),
    }

    let result
    if (existingSubmission) {
      // Update existing submission
      const { data, error } = await supabaseAdmin
        .from("assignment_submissions")
        .update(submissionData)
        .eq("id", existingSubmission.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating submission:", error)
        return NextResponse.json({ error: "Failed to update submission" }, { status: 500 })
      }

      result = data
      console.log(`Updated submission ${existingSubmission.id} for assignment ${assignmentId}`)
    } else {
      // Create new submission
      const { data, error } = await supabaseAdmin
        .from("assignment_submissions")
        .insert([submissionData])
        .select()
        .single()

      if (error) {
        console.error("Error creating submission:", error)
        return NextResponse.json({ error: "Failed to create submission" }, { status: 500 })
      }

      result = data
      console.log(`Created new submission for assignment ${assignmentId}`)
    }

    return NextResponse.json({
      success: true,
      submission: result,
    })
  } catch (error) {
    console.error("Error in submit assignment API route:", error)
    return NextResponse.json({ error: "Failed to submit assignment" }, { status: 500 })
  }
}
