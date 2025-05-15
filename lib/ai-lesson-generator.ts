import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createClient } from "@supabase/supabase-js"

// Helper function to extract JSON from a potentially markdown-formatted response
function extractJsonFromResponse(text: string): any {
  try {
    // First try to parse the text directly as JSON
    return JSON.parse(text)
  } catch (error) {
    console.log("Failed to parse direct JSON, trying to extract from markdown...")
    // If that fails, try to extract JSON from markdown code blocks
    const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/
    const match = text.match(jsonRegex)

    if (match && match[1]) {
      try {
        console.log("Found JSON in markdown code block, parsing...")
        return JSON.parse(match[1])
      } catch (innerError) {
        console.error("Failed to parse extracted JSON:", innerError)
      }
    }

    // If no code blocks found, try to find any JSON-like structure
    console.log("No code blocks found, trying to find JSON-like structure...")
    const bracketRegex = /(\{[\s\S]*\})/
    const bracketMatch = text.match(bracketRegex)

    if (bracketMatch && bracketMatch[1]) {
      try {
        console.log("Found JSON-like structure, parsing...")
        return JSON.parse(bracketMatch[1])
      } catch (innerError) {
        console.error("Failed to parse JSON structure:", innerError)
      }
    }

    console.error("No valid JSON found in response, returning fallback content")
    // Return a fallback structure if all parsing attempts fail
    return {
      title: "Fallback Content",
      sections: [
        {
          title: "Content Unavailable",
          content: "We couldn't generate proper content for this lesson. Please try again later.",
          keyPoints: ["AI generation failed", "Using fallback content"],
        },
      ],
      keyTerms: [
        {
          term: "Error",
          definition: "Failed to parse AI response into valid JSON",
        },
      ],
    }
  }
}

// Function to generate AI content for a lesson
export async function generateLessonContent(
  lessonId: string,
  title: string,
  description: string,
  subject: string,
  gradeLevel: string,
  pdfUrl: string,
) {
  console.log(`Starting AI content generation for lesson ${lessonId}`)
  console.log(`Title: ${title}`)
  console.log(`Description: ${description}`)
  console.log(`Subject: ${subject}`)
  console.log(`Grade Level: ${gradeLevel}`)
  console.log(`PDF URL: ${pdfUrl}`)

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })

    // Update lesson to indicate processing has started
    const { error: updateError } = await supabaseAdmin
      .from("lessons")
      .update({ ai_processing_needed: true })
      .eq("id", lessonId)

    if (updateError) {
      console.error("Error updating lesson status:", updateError)
    }

    // Generate lesson content
    const lessonPrompt = `
    You are an expert educator specializing in ${subject} for ${gradeLevel} students.
    
    Create a comprehensive, engaging lesson based on this title: "${title}" 
    and description: "${description}".
    
    The lesson is about: ${description}
    
    Format your response as a JSON object with the following structure:
    {
      "title": "${title}",
      "sections": [
        {
          "title": "Section title",
          "content": "Section content with explanations, examples, and educational material",
          "keyPoints": ["Key point 1", "Key point 2", ...]
        },
        ...more sections
      ],
      "keyTerms": [
        {
          "term": "Term name",
          "definition": "Clear, grade-appropriate definition"
        },
        ...more terms
      ]
    }
    
    Make sure the content is:
    1. Age-appropriate for ${gradeLevel} students
    2. Educationally sound and accurate
    3. Engaging and clear
    4. Divided into 3-5 logical sections
    5. Includes 4-8 key terms relevant to the topic
    
    IMPORTANT: Return ONLY the raw JSON object with no markdown formatting, no code blocks, and no additional text.
    Do NOT wrap your response in \`\`\`json or any other formatting.
    `

    console.log("Generating lesson content with AI...")
    console.log("Prompt length:", lessonPrompt.length)

    let lessonContent
    try {
      // Use OpenAI to generate the lesson content
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: lessonPrompt,
        temperature: 0.7,
        maxTokens: 2500,
      })

      console.log("AI response received, length:", text.length)
      console.log("First 100 chars of response:", text.substring(0, 100))

      // Extract and parse the JSON response
      lessonContent = extractJsonFromResponse(text)
      console.log("Successfully parsed lesson content JSON")
    } catch (error) {
      console.error("Error generating lesson content with AI:", error)
      throw new Error(`Failed to generate lesson content: ${error.message}`)
    }

    // Generate quiz questions
    const quizPrompt = `
    Based on this lesson about "${title}":
    
    Create 5 multiple-choice quiz questions to test student understanding of the material.
    
    Format your response as a JSON object with the following structure:
    {
      "questions": [
        {
          "question": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0, // Index of the correct answer (0-based)
          "explanation": "Explanation of why this answer is correct"
        },
        ...more questions
      ]
    }
    
    Make sure the questions:
    1. Test understanding, not just memorization
    2. Are appropriate for ${gradeLevel} students
    3. Cover different aspects of the lesson
    4. Have clear, unambiguous correct answers
    5. Include helpful explanations for each answer
    
    IMPORTANT: Return ONLY the raw JSON object with no markdown formatting, no code blocks, and no additional text.
    Do NOT wrap your response in \`\`\`json or any other formatting.
    `

    console.log("Generating quiz content with AI...")

    let quizContent
    try {
      // Use OpenAI to generate the quiz content
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: quizPrompt,
        temperature: 0.7,
        maxTokens: 1500,
      })

      console.log("Quiz AI response received, length:", text.length)
      console.log("First 100 chars of quiz response:", text.substring(0, 100))

      // Extract and parse the JSON response
      quizContent = extractJsonFromResponse(text)
      console.log("Successfully parsed quiz content JSON")
    } catch (error) {
      console.error("Error generating quiz content with AI:", error)

      // Use a fallback quiz if generation fails
      quizContent = {
        questions: [
          {
            question: `What is the main topic of "${title}"?`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: 0,
            explanation: "This is a placeholder question. The correct answer would be the main topic of the lesson.",
          },
          {
            question: "Which of the following best describes the purpose of this lesson?",
            options: ["To inform", "To entertain", "To persuade", "To instruct"],
            correctAnswer: 3,
            explanation: "Most educational content is designed to instruct students on a particular topic.",
          },
        ],
      }
    }

    console.log("Storing AI content in database...")

    // Store the AI-generated content in the database
    const { data: insertedContent, error: contentError } = await supabaseAdmin
      .from("lesson_ai_content")
      .insert([
        {
          lesson_id: lessonId,
          content: lessonContent,
          quiz: quizContent,
          is_fallback: false,
        },
      ])
      .select()
      .single()

    if (contentError) {
      console.error("Error storing AI content:", contentError)
      throw new Error(`Failed to store AI content: ${contentError.message}`)
    }

    console.log("AI content stored successfully:", insertedContent?.id)

    // Update lesson to indicate processing is complete
    const { error: finalUpdateError } = await supabaseAdmin
      .from("lessons")
      .update({
        ai_processed: true,
        ai_processing_needed: false,
      })
      .eq("id", lessonId)

    if (finalUpdateError) {
      console.error("Error updating lesson status after processing:", finalUpdateError)
    }

    console.log(`AI content generation complete for lesson ${lessonId}`)

    return {
      lesson: lessonContent,
      quiz: quizContent,
      is_fallback: false,
    }
  } catch (error) {
    console.error("Error in AI lesson generation:", error)

    // Update lesson to indicate processing failed
    try {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: { persistSession: false },
        },
      )

      await supabaseAdmin
        .from("lessons")
        .update({
          ai_processed: false,
          ai_processing_needed: false,
        })
        .eq("id", lessonId)
    } catch (updateError) {
      console.error("Error updating lesson status after failure:", updateError)
    }

    throw error
  }
}
