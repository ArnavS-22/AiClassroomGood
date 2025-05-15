import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { assignmentId, teacherId } = body

    if (!assignmentId || !teacherId) {
      return NextResponse.json({ error: "Assignment ID and teacher ID are required" }, { status: 400 })
    }

    console.log(`Attempting to delete assignment ${assignmentId} for teacher ${teacherId}`)

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Verify the assignment belongs to a classroom owned by this teacher
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from("assignments")
      .select("classroom_id, teacher_id")
      .eq("id", assignmentId)
      .single()

    if (assignmentError) {
      console.error("Error fetching assignment:", assignmentError)
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    console.log("Found assignment:", assignment)

    // Direct check if the assignment belongs to this teacher
    if (assignment.teacher_id === teacherId) {
      console.log("Teacher ID matches directly, proceeding with deletion")
    } else {
      // Verify the classroom belongs to this teacher as a fallback
      const { data: classroom, error: classroomError } = await supabaseAdmin
        .from("classrooms")
        .select("*")
        .eq("id", assignment.classroom_id)
        .eq("teacher_id", teacherId)
        .single()

      if (classroomError) {
        console.error("Error verifying classroom ownership:", classroomError)
        return NextResponse.json({ error: "You don't have permission to delete this assignment" }, { status: 403 })
      }

      console.log("Verified classroom ownership:", classroom)
    }

    // First, delete any submissions for this assignment
    const { error: submissionsDeleteError } = await supabaseAdmin
      .from("assignment_submissions")
      .delete()
      .eq("assignment_id", assignmentId)

    if (submissionsDeleteError) {
      console.error("Error deleting assignment submissions:", submissionsDeleteError)
      // Continue with assignment deletion even if submissions deletion fails
    } else {
      console.log("Successfully deleted assignment submissions")
    }

    // Delete the assignment
    const { error: deleteError } = await supabaseAdmin.from("assignments").delete().eq("id", assignmentId)

    if (deleteError) {
      console.error("Error deleting assignment:", deleteError)
      return NextResponse.json({ error: `Failed to delete assignment: ${deleteError.message}` }, { status: 500 })
    }

    console.log("Assignment deleted successfully")
    return NextResponse.json({
      message: "Assignment deleted successfully",
    })
  } catch (error: any) {
    console.error("Error in assignment deletion:", error)
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 })
  }
}
