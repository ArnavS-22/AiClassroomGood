import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { lessonId, classroomId, teacherId, visible = true } = body

    console.log("Adding lesson to classroom:", { lessonId, classroomId, teacherId, visible })

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

    // Verify teacher owns this lesson
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

    // Check if the lesson is already in the classroom
    const { data: existingClassroomLesson, error: checkError } = await supabaseAdmin
      .from("classroom_lessons")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("classroom_id", classroomId)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking for existing classroom lesson:", checkError)
      return NextResponse.json({ error: "Failed to check if lesson is already in classroom" }, { status: 500 })
    }

    let classroomLesson

    if (existingClassroomLesson) {
      // Update the visibility if the lesson is already in the classroom
      const { data: updatedClassroomLesson, error: updateError } = await supabaseAdmin
        .from("classroom_lessons")
        .update({ visible })
        .eq("id", existingClassroomLesson.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating classroom lesson:", updateError)
        return NextResponse.json({ error: "Failed to update lesson visibility" }, { status: 500 })
      }

      classroomLesson = updatedClassroomLesson
    } else {
      // Add the lesson to the classroom
      const { data: newClassroomLesson, error: insertError } = await supabaseAdmin
        .from("classroom_lessons")
        .insert([
          {
            classroom_id: classroomId,
            lesson_id: lessonId,
            teacher_id: teacherId,
            visible,
          },
        ])
        .select()
        .single()

      if (insertError) {
        console.error("Error adding lesson to classroom:", insertError)
        return NextResponse.json({ error: "Failed to add lesson to classroom" }, { status: 500 })
      }

      classroomLesson = newClassroomLesson
    }

    return NextResponse.json({
      message: existingClassroomLesson ? "Lesson visibility updated" : "Lesson added to classroom",
      classroomLesson,
    })
  } catch (error: any) {
    console.error("Error in add classroom lesson API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
