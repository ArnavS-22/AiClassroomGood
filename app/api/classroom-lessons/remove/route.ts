import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { lessonId, classroomId, teacherId } = body

    console.log("Removing lesson from classroom:", { lessonId, classroomId, teacherId })

    if (!lessonId || !classroomId || !teacherId) {
      return NextResponse.json(
        {
          error: "Missing required fields: lessonId, classroomId, teacherId",
          received: { lessonId, classroomId, teacherId },
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

    // Remove the lesson from the classroom
    const { error: deleteError } = await supabaseAdmin
      .from("classroom_lessons")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("lesson_id", lessonId)

    if (deleteError) {
      console.error("Error removing lesson from classroom:", deleteError)
      return NextResponse.json({ error: "Failed to remove lesson from classroom" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Lesson removed from classroom",
    })
  } catch (error: any) {
    console.error("Error in remove classroom lesson API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
