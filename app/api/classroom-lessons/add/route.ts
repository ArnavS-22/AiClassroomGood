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

    // First, check if the classroom exists at all
    const { data: classroom, error: classroomLookupError } = await supabaseAdmin
      .from("classrooms")
      .select("*")
      .eq("id", classroomId)
      .maybeSingle()

    if (classroomLookupError) {
      console.error("Error looking up classroom:", classroomLookupError)
      return NextResponse.json({ error: "Failed to look up classroom" }, { status: 500 })
    }

    if (!classroom) {
      console.error("Classroom not found:", { classroomId })
      return NextResponse.json({ error: `Classroom not found: {"classroomId":"${classroomId}"}` }, { status: 404 })
    }

    console.log("Found classroom:", {
      classroomId: classroom.id,
      classroomName: classroom.name,
      classroomTeacherId: classroom.teacher_id,
      requestTeacherId: teacherId,
    })

    // Now verify teacher owns this classroom
    if (classroom.teacher_id !== teacherId) {
      console.error("Teacher does not own classroom:", {
        classroomTeacherId: classroom.teacher_id,
        requestTeacherId: teacherId,
      })
      return NextResponse.json({ error: "Access denied - you don't own this classroom" }, { status: 403 })
    }

    // Verify teacher owns this lesson
    const { data: lesson, error: lessonLookupError } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .maybeSingle()

    if (lessonLookupError) {
      console.error("Error looking up lesson:", lessonLookupError)
      return NextResponse.json({ error: "Failed to look up lesson" }, { status: 500 })
    }

    if (!lesson) {
      console.error("Lesson not found:", { lessonId })
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    console.log("Found lesson:", {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonTeacherId: lesson.teacher_id,
      requestTeacherId: teacherId,
    })

    // Verify teacher owns this lesson
    if (lesson.teacher_id !== teacherId) {
      console.error("Teacher does not own lesson:", {
        lessonTeacherId: lesson.teacher_id,
        requestTeacherId: teacherId,
      })
      return NextResponse.json({ error: "Access denied - you don't own this lesson" }, { status: 403 })
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
      console.log("Lesson already in classroom, updating visibility:", {
        classroomLessonId: existingClassroomLesson.id,
        currentVisibility: existingClassroomLesson.visible,
        newVisibility: visible,
      })

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
      console.log("Adding new lesson to classroom")

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

    console.log("Successfully processed classroom lesson:", {
      operation: existingClassroomLesson ? "updated" : "added",
      classroomLessonId: classroomLesson.id,
      visible: classroomLesson.visible,
    })

    return NextResponse.json({
      message: existingClassroomLesson ? "Lesson visibility updated" : "Lesson added to classroom",
      classroomLesson,
    })
  } catch (error: any) {
    console.error("Error in add classroom lesson API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
