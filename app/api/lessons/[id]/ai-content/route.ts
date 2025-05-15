import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const lessonId = params.id

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 })
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })

    // Get the lesson details
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .single()

    if (lessonError) {
      console.error("Error fetching lesson:", lessonError)
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Get the AI-generated content
    const { data: aiContent, error: aiContentError } = await supabaseAdmin
      .from("lesson_ai_content")
      .select("*")
      .eq("lesson_id", lessonId)
      .single()

    if (aiContentError) {
      console.error("Error fetching AI content:", aiContentError)

      // If the content doesn't exist, return a specific error
      if (aiContentError.code === "PGRST116") {
        return NextResponse.json(
          {
            error: "AI content not generated yet",
            lesson: lesson,
            aiProcessed: lesson.ai_processed,
            aiProcessingNeeded: lesson.ai_processing_needed,
          },
          { status: 404 },
        )
      }

      return NextResponse.json({ error: "Failed to fetch AI content" }, { status: 500 })
    }

    return NextResponse.json({
      lesson: lesson,
      aiContent: aiContent,
    })
  } catch (error) {
    console.error("Error in get AI content endpoint:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
