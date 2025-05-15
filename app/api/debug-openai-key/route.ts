import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    // Basic validation
    if (!apiKey) {
      return NextResponse.json({
        valid: false,
        error: "OpenAI API key is not set",
        keyExists: false,
      })
    }

    // Check key format
    const isValidFormat = apiKey.startsWith("sk-") && apiKey.length > 20

    // Mask the key for security
    const maskedKey = apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 4)

    // Test the API key with a simple request
    let apiTestResult = null
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        apiTestResult = {
          success: true,
          statusCode: response.status,
          models: data.data.slice(0, 3).map((m: any) => m.id), // Just show first 3 models
        }
      } else {
        const errorData = await response.json()
        apiTestResult = {
          success: false,
          statusCode: response.status,
          error: errorData.error?.message || "Unknown error",
        }
      }
    } catch (error) {
      apiTestResult = {
        success: false,
        error: error instanceof Error ? error.message : "Error testing API key",
      }
    }

    return NextResponse.json({
      keyExists: true,
      keyFormat: {
        startsWithSk: apiKey.startsWith("sk-"),
        length: apiKey.length,
        isValidFormat,
      },
      maskedKey,
      apiTestResult,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      },
    })
  } catch (error) {
    console.error("Error checking OpenAI API key:", error)
    return NextResponse.json(
      {
        error: "An unexpected error occurred while checking the API key",
        errorDetails: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
