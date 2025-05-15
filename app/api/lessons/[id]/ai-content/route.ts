import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const lessonId = params.id

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 })
    }

    console.log(`API: Fetching lesson data for ID: ${lessonId}`)

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })

    // Get the lesson details using maybeSingle() instead of single()
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

    console.log(`API: Found lesson: ${lesson.title}`)

    // Get the AI-generated content using maybeSingle() instead of single()
    const { data: aiContent, error: aiContentError } = await supabaseAdmin
      .from("lesson_ai_content")
      .select("*")
      .eq("lesson_id", lessonId)
      .maybeSingle()

    if (aiContentError) {
      console.error("Error fetching AI content:", aiContentError)
      // For errors, log but still return the lesson
    }

    return NextResponse.json({
      lesson: lesson,
      aiContent: aiContent || null,
    })
  } catch (error) {
    console.error("Error in get AI content endpoint:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
