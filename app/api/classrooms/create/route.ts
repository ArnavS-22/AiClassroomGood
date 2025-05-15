import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Function to generate a random join code
function generateJoinCode(length = 6) {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed similar looking characters
  let result = ""
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export async function POST(request: Request) {
  try {
    // Get the request body
    const { name, description, teacherId } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Classroom name is required" }, { status: 400 })
    }

    if (!teacherId) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 })
    }

    console.log("Creating classroom:", { name, description, teacherId })

    // Create a Supabase admin client with the service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Verify the teacher exists and has the teacher role
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", teacherId)
      .single()

    if (userError) {
      console.error("User verification error:", userError)
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    if (userData.role !== "teacher") {
      return NextResponse.json({ error: "Only teachers can create classrooms" }, { status: 403 })
    }

    // Generate a unique join code
    const joinCode = generateJoinCode()

    // Create the classroom using the service role client
    const { data, error } = await supabaseAdmin
      .from("classrooms")
      .insert({
        name,
        description: description || null,
        teacher_id: teacherId,
        join_code: joinCode,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating classroom:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("Classroom created successfully:", data)

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error creating classroom:", error)
    return NextResponse.json({ error: error.message || "Failed to create classroom" }, { status: 500 })
  }
}
