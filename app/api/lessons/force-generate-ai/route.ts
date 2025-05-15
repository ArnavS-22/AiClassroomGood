import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { generateLessonContent } from "@/lib/ai-lesson-generator"

export async function POST(request: Request) {
  try {
    const { lessonId } = await request.json()

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 })
    }

    console.log(`API: Force generating AI content for lesson ID: ${lessonId}`)

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })

    // Get the lesson details
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .maybeSingle()

    if (lessonError) {
      console.error("Error fetching lesson:", lessonError)
      return NextResponse.json({ error: "Failed to fetch lesson" }, { status: 500 })
    }

    if (!lesson) {
      console.log(`API: Lesson not found with ID: ${lessonId}`)
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    console.log(`API: Found lesson: ${lesson.title}, starting AI generation...`)

    try {
      // Generate content synchronously for immediate feedback
      const result = await generateLessonContent(
        lessonId,
        lesson.title,
        lesson.description,
        lesson.subject,
        lesson.grade_level,
        lesson.file_url,
      )

      return NextResponse.json({
        message: "AI content generation completed successfully",
        success: true,
        result,
      })
    } catch (error) {
      console.error("Error generating AI content:", error)
      return NextResponse.json(
        {
          error: "Failed to generate AI content",
          details: error.message || "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in force generate AI endpoint:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
