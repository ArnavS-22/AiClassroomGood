import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get the API key from environment
    const apiKey = process.env.OPENAI_API_KEY || "not-set"

    // Create a simple fetch request to OpenAI to test the key
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    // Return diagnostic information
    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      apiKeyFirstChars: apiKey.substring(0, 7) + "...",
      apiKeyLength: apiKey.length,
      response: data,
      hasWhitespace: apiKey.trim() !== apiKey,
      suggestion:
        response.status === 401
          ? "Your API key appears to be invalid or expired. Please generate a new one."
          : "Key format looks good but there may be another issue.",
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        suggestion: "There was an error testing your API key. Check server logs for details.",
      },
      { status: 500 },
    )
  }
}
