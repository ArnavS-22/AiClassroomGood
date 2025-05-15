import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get("teacherId")

  if (!teacherId) {
    return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 })
  }

  try {
    console.log("Fetching classrooms for teacher:", teacherId)

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Fetch classrooms without using joins or complex queries
    const { data: classrooms, error: classroomsError } = await supabaseAdmin
      .from("classrooms")
      .select("id, name, description, join_code, created_at, teacher_id")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })

    if (classroomsError) {
      console.error("Error fetching classrooms:", classroomsError)
      throw classroomsError
    }

    console.log(`Found ${classrooms.length} classrooms for teacher ${teacherId}`)

    // Initialize classrooms with student_count set to 0
    const classroomsWithStudentCount = await Promise.all(
      classrooms.map(async (classroom) => {
        const { count, error: countError } = await supabaseAdmin
          .from("classroom_students")
          .select("*", { count: "exact", head: true })
          .eq("classroom_id", classroom.id)

        if (countError) {
          console.error("Error counting students:", countError)
        }

        return {
          ...classroom,
          student_count: countError ? 0 : count || 0,
        }
      }),
    )

    return NextResponse.json(classroomsWithStudentCount)
  } catch (error) {
    console.error("Error fetching classrooms:", error)
    return NextResponse.json({ error: "Failed to fetch classrooms" }, { status: 500 })
  }
}
