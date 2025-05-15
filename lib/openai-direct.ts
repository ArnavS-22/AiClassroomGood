import { Configuration, OpenAIApi } from "openai"

// Create a direct OpenAI client
export function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error("OpenAI API key is not set in environment variables")
  }

  // Trim the key to remove any accidental whitespace
  const trimmedKey = apiKey.trim()

  const configuration = new Configuration({
    apiKey: trimmedKey,
  })

  return new OpenAIApi(configuration)
}
