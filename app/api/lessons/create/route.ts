import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, subject, gradeLevel, fileUrl, teacherId } = body

    if (!title || !description || !subject || !gradeLevel || !fileUrl || !teacherId) {
      return NextResponse.json({ error: "Missing required fields for lesson creation" }, { status: 400 })
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Create the lesson
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .insert([
        {
          title,
          description,
          subject,
          grade_level: gradeLevel,
          file_url: fileUrl,
          teacher_id: teacherId,
        },
      ])
      .select()
      .single()

    if (lessonError) {
      console.error("Error creating lesson:", lessonError)
      return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Lesson created successfully",
      lesson,
    })
  } catch (error) {
    console.error("Error in lesson creation:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
