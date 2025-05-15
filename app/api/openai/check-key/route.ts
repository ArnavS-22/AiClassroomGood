import { NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

// Function to validate OpenAI API key format
function isValidOpenAIKey(key: string | undefined): boolean {
  if (!key) return false
  return key.startsWith("sk-") && key.length > 20
}

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    // Check if API key exists and has the correct format
    if (!isValidOpenAIKey(apiKey)) {
      return NextResponse.json({
        isValid: false,
        reason: "Invalid format",
        keyFormat: apiKey ? `${apiKey.substring(0, 5)}...` : "undefined",
      })
    }

    // Try a simple API call to verify the key works
    try {
      const { text } = await generateText({
        model: openai("gpt-3.5-turbo"),
        prompt: "Say hello",
        maxTokens: 5,
      })

      return NextResponse.json({
        isValid: true,
        test: text,
      })
    } catch (apiError: any) {
      return NextResponse.json({
        isValid: false,
        reason: "API error",
        error: apiError.message,
      })
    }
  } catch (error) {
    console.error("Error checking API key:", error)
    return NextResponse.json({ isValid: false, reason: "Server error" }, { status: 500 })
  }
}
