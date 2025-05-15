import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get("studentId")

  if (!studentId) {
    return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
  }

  try {
    console.log("Fetching classrooms for student:", studentId)

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Get classrooms that the student is enrolled in
    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
      .from("classroom_students")
      .select("classroom_id")
      .eq("student_id", studentId)

    if (enrollmentsError) {
      console.error("Error fetching enrollments:", enrollmentsError)
      throw enrollmentsError
    }

    if (!enrollments || enrollments.length === 0) {
      console.log("No enrollments found for student:", studentId)
      return NextResponse.json([])
    }

    const classroomIds = enrollments.map((enrollment) => enrollment.classroom_id)
    console.log(`Found ${classroomIds.length} classroom enrollments for student ${studentId}`)

    // Get the classroom details - removed grade_level from the query
    const { data: classroomsData, error: classroomsError } = await supabaseAdmin
      .from("classrooms")
      .select(`
        id, name, teacher_id, created_at,
        teacher:users!teacher_id(email)
      `)
      .in("id", classroomIds)
      .order("created_at", { ascending: false })

    if (classroomsError) {
      console.error("Error fetching classrooms:", classroomsError)
      throw classroomsError
    }

    // Format the data to include teacher name
    const formattedData = classroomsData.map((classroom) => ({
      ...classroom,
      teacher_name: classroom.teacher?.email || "Unknown Teacher",
    }))

    console.log(`Successfully fetched ${formattedData.length} classrooms for student ${studentId}`)
    return NextResponse.json(formattedData || [])
  } catch (error) {
    console.error("Error in student-classrooms API route:", error)
    return NextResponse.json({ error: "Failed to fetch classrooms" }, { status: 500 })
  }
}
