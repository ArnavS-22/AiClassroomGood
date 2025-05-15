import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { generateLessonContent } from "@/lib/ai-lesson-generator"

export async function POST(request: Request) {
  try {
    const { lessonId, teacherId } = await request.json()

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 })
    }

    console.log(`API: Generating AI content for lesson ID: ${lessonId}`)

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })

    // Get the lesson details first
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .single()

    if (lessonError) {
      console.error("Error fetching lesson:", lessonError)
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Check if the user has permission (either they're the teacher or a student can request generation)
    if (teacherId && lesson.teacher_id !== teacherId) {
      console.error("Permission denied: Teacher ID mismatch")
      return NextResponse.json(
        { error: "You don't have permission to generate content for this lesson" },
        { status: 403 },
      )
    }

    // Check if AI content already exists
    const { data: existingContent } = await supabaseAdmin
      .from("lesson_ai_content")
      .select("id")
      .eq("lesson_id", lessonId)
      .single()

    if (existingContent) {
      return NextResponse.json({
        message: "Content already exists for this lesson",
        alreadyExists: true,
      })
    }

    // Start content generation in the background
    // We don't await this to avoid timeout issues
    generateLessonContent(
      lessonId,
      lesson.title,
      lesson.description,
      lesson.subject,
      lesson.grade_level,
      lesson.file_url,
    ).catch((error) => {
      console.error("Background generation failed:", error)
    })

    // Update lesson to indicate processing has started
    await supabaseAdmin
      .from("lessons")
      .update({
        ai_processing_needed: true,
      })
      .eq("id", lessonId)

    return NextResponse.json({
      message: "AI content generation started",
      processing: true,
    })
  } catch (error) {
    console.error("Error in generate AI endpoint:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
