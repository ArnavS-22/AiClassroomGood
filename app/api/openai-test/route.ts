import { NextResponse } from "next/server"
import { generateText } from "ai"
import { getOpenAIModel } from "@/lib/openai-config"

export async function GET() {
  try {
    // Simple test of the OpenAI API
    const { text } = await generateText({
      model: getOpenAIModel("gpt-3.5-turbo"),
      prompt: "Say hello",
      maxTokens: 10,
    })

    return NextResponse.json({
      success: true,
      message: "API key is working correctly",
      response: text,
    })
  } catch (error: any) {
    console.error("OpenAI test error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "API key test failed",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
