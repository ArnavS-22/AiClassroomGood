import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Parse request body first to get the data we need
    const requestData = await request.json()
    const { assignment_id, score, answers, userId } = requestData

    if (!assignment_id || score === undefined || !answers || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create Supabase client with service role to bypass auth
    const supabase = createServerClient()

    console.log("Processing submission for user:", userId, "assignment:", assignment_id)

    // Insert the quiz results into the database
    const { data, error } = await supabase
      .from("assignment_submissions")
      .insert({
        assignment_id,
        student_id: userId,
        answers, // This is now a JSONB column
        status: "submitted", // Add status field
        grade: score.toString(), // Convert score to string for the grade field
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error("Error saving quiz results:", error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Quiz submitted successfully",
      data,
    })
  } catch (error: any) {
    console.error("Error submitting quiz:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to submit quiz",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
