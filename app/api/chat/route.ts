import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: Request) {
  try {
    const { message, lessonId, userId } = await request.json()

    if (!message || !lessonId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Verify the user has access to this lesson
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .select("title, description, subject, grade_level")
      .eq("id", lessonId)
      .single()

    if (lessonError) {
      console.error("Error fetching lesson:", lessonError)
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Get AI-generated content if available
    const { data: aiContent } = await supabaseAdmin
      .from("lesson_ai_content")
      .select("content")
      .eq("lesson_id", lessonId)
      .single()

    // Get previous messages for context
    const { data: previousMessages } = await supabaseAdmin
      .from("messages")
      .select("role, message_text")
      .eq("lesson_id", lessonId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(10)

    // Format previous messages for the AI
    const messageHistory = previousMessages?.map((msg) => `${msg.role}: ${msg.message_text}`).join("\n") || ""

    // Create the prompt for the AI
    const prompt = `
    You are an AI learning assistant helping a student with a lesson on "${lesson.title}".
    
    Lesson details:
    - Title: ${lesson.title}
    - Subject: ${lesson.subject}
    - Grade level: ${lesson.grade_level}
    - Description: ${lesson.description}
    
    ${aiContent ? `AI-generated content: ${JSON.stringify(aiContent.content).substring(0, 1000)}...` : ""}
    
    Previous conversation:
    ${messageHistory}
    
    Student's question: ${message}
    
    Provide a helpful, educational response that:
    1. Answers the student's question directly
    2. Explains concepts in an age-appropriate way
    3. Encourages critical thinking
    4. Is conversational and engaging
    5. Stays focused on the lesson topic
    
    Your response:
    `

    let aiResponse

    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY || process.env.USE_AI_FALLBACK === "true") {
        throw new Error("Using fallback mode")
      }

      // Generate response using OpenAI
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
        temperature: 0.7,
        maxTokens: 1000,
      })

      aiResponse = text
    } catch (error) {
      console.warn("Using fallback AI response:", error)

      // Fallback response if OpenAI is not available
      aiResponse = `I'd be happy to help you with your question about ${lesson.title}. 
      
This is a fallback response as the AI service is currently unavailable. In a fully implemented version, I would provide a detailed, personalized answer to your specific question.

Please try again later when the AI service is available, or contact your teacher for assistance.`
    }

    // Save AI response to database
    const timestamp = new Date().toISOString()
    const { data: savedResponse, error: saveError } = await supabaseAdmin
      .from("messages")
      .insert([
        {
          user_id: userId,
          lesson_id: lessonId,
          role: "ai",
          message_text: aiResponse,
          created_at: timestamp,
        },
      ])
      .select()
      .single()

    if (saveError) {
      console.error("Error saving AI response:", saveError)
      return NextResponse.json({ error: "Failed to save response" }, { status: 500 })
    }

    return NextResponse.json({
      id: savedResponse.id,
      content: aiResponse,
      timestamp,
    })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
