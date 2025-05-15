import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const subject = formData.get("subject") as string
    const gradeLevel = formData.get("gradeLevel") as string
    const teacherId = formData.get("teacherId") as string
    const assignToClassroom = formData.get("assignToClassroom") === "true"
    const classroomId = formData.get("classroomId") as string
    const generateAI = formData.get("generateAI") === "true"

    if (!file || !title || !description || !subject || !gradeLevel || !teacherId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Verify the teacher exists
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", teacherId)
      .eq("role", "teacher")
      .single()

    if (teacherError) {
      console.error("Error verifying teacher:", teacherError)
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Generate a unique file name
    const fileExt = "pdf" // We're only accepting PDFs
    const fileName = `${teacherId}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`

    // Check if the bucket exists, if not create it
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const bucketName = "lessons"
    const bucketExists = buckets?.some((bucket) => bucket.name === bucketName)

    if (!bucketExists) {
      console.log(`Creating bucket: ${bucketName}`)
      const { error: createBucketError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ["application/pdf"],
      })

      if (createBucketError) {
        console.error("Error creating bucket:", createBucketError)
        return NextResponse.json(
          { error: `Failed to create storage bucket: ${createBucketError.message}` },
          { status: 500 },
        )
      }
    }

    // Upload the file to Supabase Storage
    const { data: fileData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (uploadError) {
      console.error("Error uploading file:", uploadError)
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 })
    }

    // Get the public URL for the file
    const { data: urlData } = await supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName)

    // Insert lesson data into the database
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .insert([
        {
          title,
          description,
          subject,
          grade_level: gradeLevel,
          file_url: urlData.publicUrl,
          teacher_id: teacherId,
          // Use the new AI-related columns
          ai_processed: false,
          ai_processing_needed: generateAI,
        },
      ])
      .select()
      .single()

    if (lessonError) {
      console.error("Error creating lesson:", lessonError)
      return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 })
    }

    // If assignToClassroom is true, create an assignment for the selected classroom
    if (assignToClassroom && classroomId) {
      // Verify the teacher owns this classroom
      const { data: classroom, error: classroomError } = await supabaseAdmin
        .from("classrooms")
        .select("*")
        .eq("id", classroomId)
        .eq("teacher_id", teacherId)
        .single()

      if (classroomError) {
        console.error("Error verifying classroom ownership:", classroomError)
        return NextResponse.json(
          { error: "You don't have permission to assign lessons to this classroom" },
          { status: 403 },
        )
      }

      // Check if an assignment already exists for this lesson and classroom
      const { data: existingAssignment, error: checkError } = await supabaseAdmin
        .from("assignments")
        .select("*")
        .eq("lesson_id", lesson.id)
        .eq("classroom_id", classroomId)
        .maybeSingle()

      if (checkError) {
        console.error("Error checking for existing assignment:", checkError)
      }

      // Only create a new assignment if one doesn't already exist
      if (!existingAssignment) {
        // Create the assignment
        const { data: assignment, error: assignmentError } = await supabaseAdmin
          .from("assignments")
          .insert([
            {
              title,
              description,
              classroom_id: classroomId,
              lesson_id: lesson.id,
              teacher_id: teacherId,
              due_date: null,
            },
          ])
          .select()
          .single()

        if (assignmentError) {
          console.error("Error creating assignment:", assignmentError)
          return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 })
        }

        return NextResponse.json({
          message: "Lesson uploaded and assigned to classroom successfully",
          lesson,
          assignment,
          aiProcessing: generateAI,
        })
      } else {
        console.log("Assignment already exists for this lesson and classroom, skipping creation")
        return NextResponse.json({
          message: "Lesson uploaded successfully (assignment already exists)",
          lesson,
          assignment: existingAssignment,
          aiProcessing: generateAI,
        })
      }
    }

    return NextResponse.json({
      message: "Lesson uploaded successfully",
      lesson,
      aiProcessing: generateAI,
    })
  } catch (error) {
    console.error("Error in lesson upload:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

export const config = {
  api: {
    bodyParser: false, // Don't parse the body, we'll handle it manually
  },
}
