import { openai } from "@ai-sdk/openai"

// Simple function to get the OpenAI model with your API key
export function getOpenAIModel(model = "gpt-4") {
  // Use gpt-4 as default since it's more reliable for structured outputs
  return openai(model)
}
