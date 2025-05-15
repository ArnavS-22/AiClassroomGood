import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { generateLessonContent } from "@/lib/ai-lesson-generator"

// Function to validate OpenAI API key format
function isValidOpenAIKey(key: string | undefined): boolean {
  if (!key) return false
  return key.startsWith("sk-") && key.length > 20
}

export async function POST(request: Request) {
  try {
    const { lessonId, teacherId } = await request.json()

    if (!lessonId || !teacherId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if API key is valid
    const apiKey = process.env.OPENAI_API_KEY
    const isValidKey = isValidOpenAIKey(apiKey)

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
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
      .select("id, is_fallback")
      .eq("lesson_id", lessonId)
      .single()

    if (existingContent) {
      return NextResponse.json({
        message: "Content already exists for this lesson",
        alreadyExists: true,
        isFallback: existingContent.is_fallback,
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
      !isValidKey, // Force fallback if key is invalid
    ).catch((error) => {
      console.error("Background generation failed:", error)
    })

    return NextResponse.json({
      message: isValidKey ? "AI content generation started" : "Fallback content generation started",
      processing: true,
      usingFallback: !isValidKey,
      apiKeyStatus: isValidKey ? "valid" : "invalid",
    })
  } catch (error) {
    console.error("Error in generate AI endpoint:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
