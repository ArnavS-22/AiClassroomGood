import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { generateLessonContent } from "@/lib/ai-lesson-generator"

export async function POST(request: Request) {
  try {
    const { lessonId, teacherId } = await request.json()

    if (!lessonId || !teacherId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Verify the teacher exists and owns this lesson
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .eq("teacher_id", teacherId)
      .single()

    if (lessonError) {
      console.error("Error verifying lesson ownership:", lessonError)
      return NextResponse.json({ error: "Lesson not found or you don't have permission" }, { status: 404 })
    }

    // Check if AI content already exists
    const { data: existingContent } = await supabaseAdmin
      .from("lesson_ai_content")
      .select("id")
      .eq("lesson_id", lessonId)
      .single()

    if (existingContent) {
      return NextResponse.json({
        message: "AI content already exists for this lesson",
        alreadyExists: true,
      })
    }

    // Start AI content generation in the background
    // We don't await this to avoid timeout issues
    generateLessonContent(
      lessonId,
      lesson.title,
      lesson.description,
      lesson.subject,
      lesson.grade_level,
      lesson.file_url,
    ).catch((error) => {
      console.error("Background AI generation failed:", error)
    })

    return NextResponse.json({
      message: "AI content generation started",
      processing: true,
    })
  } catch (error) {
    console.error("Error in generate AI endpoint:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
