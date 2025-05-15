import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const classroomId = searchParams.get("classroomId")
  const studentId = searchParams.get("studentId")

  if (!classroomId || !studentId) {
    return NextResponse.json({ error: "Classroom ID and Student ID are required" }, { status: 400 })
  }

  try {
    console.log(`Fetching classroom ${classroomId} details for student ${studentId}`)

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Verify student is enrolled in this classroom
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from("classroom_students")
      .select("*")
      .eq("classroom_id", classroomId)
      .eq("student_id", studentId)
      .single()

    if (enrollmentError) {
      console.error("Error verifying enrollment:", enrollmentError)
      return NextResponse.json({ error: "Failed to verify enrollment" }, { status: 500 })
    }

    if (!enrollment) {
      console.log(`Student ${studentId} is not enrolled in classroom ${classroomId}`)
      return NextResponse.json({ error: "Student is not enrolled in this classroom" }, { status: 403 })
    }

    // Fetch classroom details
    const { data: classroom, error: classroomError } = await supabaseAdmin
      .from("classrooms")
      .select(`
        id, name, description, created_at, join_code,
        teacher:teacher_id(id, email, full_name)
      `)
      .eq("id", classroomId)
      .single()

    if (classroomError) {
      console.error("Error fetching classroom:", classroomError)
      return NextResponse.json({ error: "Failed to fetch classroom details" }, { status: 500 })
    }

    if (!classroom) {
      console.log(`Classroom ${classroomId} not found`)
      return NextResponse.json({ error: "Classroom not found" }, { status: 404 })
    }

    console.log(`Successfully fetched classroom ${classroomId} for student ${studentId}`)
    return NextResponse.json(classroom)
  } catch (error) {
    console.error("Error in student classroom API route:", error)
    return NextResponse.json({ error: "Failed to fetch classroom details" }, { status: 500 })
  }
}
