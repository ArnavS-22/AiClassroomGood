import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// Set cache control headers for the response
export const revalidate = 30 // Revalidate at most every 30 seconds

export async function GET(request: Request) {
  try {
    // Get the teacher ID from the query parameters
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get("teacherId")
    const noCache = searchParams.get("nocache") // Check if cache should be bypassed

    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 })
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createRouteHandlerClient(
      { cookies },
      {
        options: {
          db: { schema: "public" },
          auth: {
            persistSession: false,
          },
        },
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    )

    console.log(`${noCache ? "Force refreshing" : "Fetching"} classrooms for teacher:`, teacherId)

    // Fetch classrooms for the teacher
    const { data: classroomsData, error: classroomsError } = await supabaseAdmin
      .from("classrooms")
      .select("id, name, description, join_code, created_at")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })

    if (classroomsError) {
      console.error("Error fetching classrooms:", classroomsError)
      return NextResponse.json({ error: classroomsError.message }, { status: 500 })
    }

    console.log(`Fetched ${classroomsData?.length || 0} classrooms`)

    // Initialize classrooms with student_count set to 0
    const classroomsWithStudentCount = await Promise.all(
      (classroomsData || []).map(async (classroom) => {
        try {
          // Get student count for each classroom
          const { count, error: countError } = await supabaseAdmin
            .from("classroom_students")
            .select("*", { count: "exact", head: true })
            .eq("classroom_id", classroom.id)

          return {
            ...classroom,
            teacher_id: teacherId,
            student_count: countError ? 0 : count || 0,
          }
        } catch (error) {
          console.error(`Error getting student count for classroom ${classroom.id}:`, error)
          return {
            ...classroom,
            teacher_id: teacherId,
            student_count: 0,
          }
        }
      }),
    )

    // Set cache control headers based on whether cache should be bypassed
    const headers = noCache
      ? {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        }
      : {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        }

    return NextResponse.json(classroomsWithStudentCount, { headers })
  } catch (error) {
    console.error("Unexpected error in get-classrooms route:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
