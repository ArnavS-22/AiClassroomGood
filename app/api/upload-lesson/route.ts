import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// The name of the bucket we'll use for lesson files
const BUCKET_NAME = "lessons"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Parse the multipart form data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: "No user ID provided" }, { status: 400 })
    }

    // Check if the bucket exists, if not create it
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME)

    if (!bucketExists) {
      console.log(`Creating bucket: ${BUCKET_NAME}`)
      const { error: createBucketError } = await supabase.storage.createBucket(BUCKET_NAME, {
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

    // Convert the file to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Generate a unique file name
    const fileExt = "pdf" // We're only accepting PDFs
    const fileName = `${userId}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`

    // Upload the file to Supabase Storage
    const { data: fileData, error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(fileName, buffer, {
      contentType: "application/pdf",
      upsert: false,
    })

    if (uploadError) {
      console.error("Error uploading file:", uploadError)
      return NextResponse.json({ error: `Failed to upload file: ${uploadError.message}` }, { status: 500 })
    }

    // Get the public URL for the file
    const { data: urlData } = await supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName)

    return NextResponse.json({ fileUrl: urlData.publicUrl })
  } catch (error: any) {
    console.error("Error in upload-lesson API route:", error)
    return NextResponse.json({ error: `Server error: ${error.message}` }, { status: 500 })
  }
}

export const config = {
  api: {
    bodyParser: false, // Don't parse the body, we'll handle it manually
  },
}
