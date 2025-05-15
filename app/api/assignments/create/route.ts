import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, classroomId, lessonId = null, teacherId, dueDate = null } = body

    console.log("Assignment creation request:", { title, description, classroomId, lessonId, teacherId, dueDate })

    if (!title || !classroomId || !teacherId) {
      return NextResponse.json(
        {
          error: "Missing required fields: title, classroomId, teacherId",
          received: { title, classroomId, lessonId, teacherId },
        },
        { status: 400 },
      )
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createServerClient()

    // Verify teacher owns this classroom
    const { data: classroom, error: classroomError } = await supabaseAdmin
      .from("classrooms")
      .select("*")
      .eq("id", classroomId)
      .eq("teacher_id", teacherId)
      .single()

    if (classroomError) {
      console.error("Error verifying classroom ownership:", classroomError)
      if (classroomError.code === "PGRST116") {
        return NextResponse.json({ error: "Classroom not found or access denied" }, { status: 404 })
      }
      return NextResponse.json({ error: "Failed to verify classroom ownership" }, { status: 500 })
    }

    // Verify teacher owns this lesson if a lesson ID is provided
    if (lessonId) {
      const { data: lesson, error: lessonError } = await supabaseAdmin
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .eq("teacher_id", teacherId)
        .single()

      if (lessonError) {
        console.error("Error verifying lesson ownership:", lessonError)
        if (lessonError.code === "PGRST116") {
          return NextResponse.json({ error: "Lesson not found or access denied" }, { status: 404 })
        }
        return NextResponse.json({ error: "Failed to verify lesson ownership" }, { status: 500 })
      }
    }

    // Check if an assignment already exists with the same title for this classroom
    const { data: existingAssignment, error: checkError } = await supabaseAdmin
      .from("assignments")
      .select("*")
      .eq("title", title)
      .eq("classroom_id", classroomId)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking for existing assignment:", checkError)
    }

    // Only create a new assignment if one doesn't already exist with the same title
    if (!existingAssignment) {
      // Insert assignment data into the database
      const { data: assignment, error: insertError } = await supabaseAdmin
        .from("assignments")
        .insert([
          {
            title,
            description: description || null,
            classroom_id: classroomId,
            lesson_id: lessonId, // Can be null now
            due_date: dueDate || null,
            teacher_id: teacherId,
          },
        ])
        .select()
        .single()

      if (insertError) {
        console.error("Error creating assignment:", insertError)
        return NextResponse.json({ error: "Failed to create assignment: " + insertError.message }, { status: 500 })
      }

      return NextResponse.json({
        message: "Assignment created successfully",
        assignment,
      })
    } else {
      console.log("Assignment with this title already exists for this classroom, skipping creation")
      return NextResponse.json({
        message: "Assignment already exists",
        assignment: existingAssignment,
      })
    }
  } catch (error: any) {
    console.error("Error in create assignment API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
