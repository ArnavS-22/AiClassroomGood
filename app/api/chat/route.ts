import { getOpenAIModel } from "@/lib/openai-config"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const { message, lessonId, userId, role } = await request.json()

    if (!message || !lessonId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })

    // Get the lesson content
    const { data: lessonContent, error: lessonError } = await supabaseAdmin
      .from("lesson_ai_content")
      .select("content")
      .eq("lesson_id", lessonId)
      .single()

    if (lessonError) {
      console.error("Error fetching lesson content:", lessonError)
      return NextResponse.json({ error: "Lesson content not found" }, { status: 404 })
    }

    // Get previous messages for context
    const { data: previousMessages, error: messagesError } = await supabaseAdmin
      .from("messages")
      .select("content, role")
      .eq("lesson_id", lessonId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(10)

    if (messagesError) {
      console.error("Error fetching previous messages:", messagesError)
      // Continue without previous messages
    }

    // Save the user message
    const { error: saveError } = await supabaseAdmin.from("messages").insert([
      {
        lesson_id: lessonId,
        user_id: userId,
        content: message,
        role: "user",
      },
    ])

    if (saveError) {
      console.error("Error saving user message:", saveError)
      // Continue anyway
    }

    // Build the context from previous messages
    let conversationContext = ""
    if (previousMessages && previousMessages.length > 0) {
      conversationContext = previousMessages
        .map((msg) => `${msg.role === "user" ? "Student" : "Tutor"}: ${msg.content}`)
        .join("\n")
    }

    // Build the prompt for the AI
    const prompt = `
    You are an AI tutor helping a student understand a lesson about "${lessonContent.content.title}".
    
    Here's a summary of the lesson content:
    ${JSON.stringify(lessonContent.content)}
    
    Previous conversation:
    ${conversationContext}
    
    Student: ${message}
    
    Provide a helpful, educational response that explains concepts clearly and encourages critical thinking.
    Keep your response concise (under 250 words) but thorough.
    `

    // Generate the AI response
    const { text: aiResponse } = await generateText({
      model: getOpenAIModel("gpt-4o"),
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 500,
    })

    // Save the AI response
    const { error: saveAiError } = await supabaseAdmin.from("messages").insert([
      {
        lesson_id: lessonId,
        user_id: userId,
        content: aiResponse,
        role: "assistant",
      },
    ])

    if (saveAiError) {
      console.error("Error saving AI response:", saveAiError)
      // Continue anyway
    }

    return NextResponse.json({ response: aiResponse })
  } catch (error) {
    console.error("Error in chat endpoint:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
