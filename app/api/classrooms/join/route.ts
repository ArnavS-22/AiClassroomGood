import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { joinCode, studentId } = await request.json()

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    if (!joinCode) {
      return NextResponse.json({ error: "Join code is required" }, { status: 400 })
    }

    console.log(`Attempting to join classroom with code: ${joinCode} for student: ${studentId}`)

    // Use the server client with service role to bypass RLS
    const supabase = createServerClient()

    // Find the classroom with the given join code
    const { data: classroom, error: classroomError } = await supabase
      .from("classrooms")
      .select("id, name")
      .eq("join_code", joinCode)
      .single()

    if (classroomError || !classroom) {
      console.error("Error finding classroom:", classroomError)
      return NextResponse.json({ error: "Invalid join code" }, { status: 400 })
    }

    console.log(`Found classroom: ${classroom.id} (${classroom.name})`)

    // Check if the student is already in the classroom
    const { data: existingMembership, error: membershipError } = await supabase
      .from("classroom_students")
      .select("*")
      .eq("classroom_id", classroom.id)
      .eq("student_id", studentId)
      .maybeSingle()

    if (existingMembership) {
      console.log(`Student ${studentId} is already a member of classroom ${classroom.id}`)
      return NextResponse.json({ error: "You are already a member of this classroom" }, { status: 400 })
    }

    console.log(`Adding student ${studentId} to classroom ${classroom.id}`)

    // Add the student to the classroom
    const { error: joinError } = await supabase.from("classroom_students").insert({
      classroom_id: classroom.id,
      student_id: studentId,
    })

    if (joinError) {
      console.error("Error joining classroom:", joinError)
      return NextResponse.json({ error: "Failed to join classroom" }, { status: 500 })
    }

    console.log(`Successfully added student ${studentId} to classroom ${classroom.id}`)
    return NextResponse.json({ success: true, classroom })
  } catch (error) {
    console.error("Error joining classroom:", error)
    return NextResponse.json({ error: "Failed to join classroom" }, { status: 500 })
  }
}
