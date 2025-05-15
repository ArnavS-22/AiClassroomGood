import { OpenAI } from "@ai-sdk/openai"

export function openaiClient() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.warn("OPENAI_API_KEY is not set. Using fallback AI response.")
  }

  return new OpenAI({ apiKey })
}
