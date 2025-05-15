import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "Classroom ID is required" }, { status: 400 })
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Verify the classroom exists
    const { data: classroom, error: classroomError } = await supabaseAdmin
      .from("classrooms")
      .select("*")
      .eq("id", id)
      .single()

    if (classroomError) {
      console.error("Error fetching classroom:", classroomError)
      return NextResponse.json({ error: "Classroom not found" }, { status: 404 })
    }

    // Get all students in the classroom
    const { data: classroomStudents, error: studentsError } = await supabaseAdmin
      .from("classroom_students")
      .select(`
        *,
        student:users(*)
      `)
      .eq("classroom_id", id)

    if (studentsError) {
      console.error("Error fetching classroom students:", studentsError)
      return NextResponse.json({ error: "Failed to fetch classroom students" }, { status: 500 })
    }

    return NextResponse.json(classroomStudents || [])
  } catch (error: any) {
    console.error("Error in classroom students API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
