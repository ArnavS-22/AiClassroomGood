import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function DELETE(request: Request) {
  try {
    const { classroomId, teacherId } = await request.json()

    if (!classroomId) {
      return NextResponse.json({ error: "Classroom ID is required" }, { status: 400 })
    }

    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 })
    }

    console.log(`Attempting to delete classroom ${classroomId} for teacher ${teacherId}`)

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // First verify that the classroom belongs to the teacher
    const { data: classroom, error: fetchError } = await supabaseAdmin
      .from("classrooms")
      .select("id")
      .eq("id", classroomId)
      .eq("teacher_id", teacherId)
      .single()

    if (fetchError) {
      console.error("Error verifying classroom ownership:", fetchError)
      return NextResponse.json(
        { error: "Failed to verify classroom ownership or classroom not found" },
        { status: 404 },
      )
    }

    // Delete the classroom (cascade will handle related records)
    const { error: deleteError } = await supabaseAdmin.from("classrooms").delete().eq("id", classroomId)

    if (deleteError) {
      console.error("Error deleting classroom:", deleteError)
      return NextResponse.json({ error: "Failed to delete classroom" }, { status: 500 })
    }

    console.log(`Successfully deleted classroom ${classroomId}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected error deleting classroom:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
