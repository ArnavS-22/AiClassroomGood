import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createClient } from "@supabase/supabase-js"

// Function to generate AI content for a lesson
export async function generateLessonContent(
  lessonId: string,
  title: string,
  description: string,
  subject: string,
  gradeLevel: string,
  pdfUrl: string,
) {
  try {
    console.log(`Generating AI content for lesson ${lessonId}`)

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
      },
    })

    // Update lesson to indicate processing has started
    await supabaseAdmin.from("lessons").update({ ai_processing_needed: true }).eq("id", lessonId)

    // Generate lesson content
    const lessonPrompt = `
    You are an expert educator specializing in ${subject} for ${gradeLevel} students.
    
    Create a comprehensive, engaging lesson based on this title: "${title}" 
    and description: "${description}".
    
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
    
    Return ONLY the JSON object with no additional text.
    `

    let lessonContent
    try {
      // Use OpenAI to generate the lesson content
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: lessonPrompt,
        temperature: 0.7,
        maxTokens: 2500,
      })

      // Parse the JSON response
      lessonContent = JSON.parse(text)
    } catch (error) {
      console.error("Error generating lesson content with AI:", error)

      // Fallback content if AI generation fails
      lessonContent = {
        title: title,
        sections: [
          {
            title: "Introduction",
            content: description,
            keyPoints: ["This is a placeholder for AI-generated content."],
          },
        ],
        keyTerms: [
          {
            term: "AI Content",
            definition: "Content that could not be generated. Please try again later.",
          },
        ],
      }
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
    
    Return ONLY the JSON object with no additional text.
    `

    let quizContent
    try {
      // Use OpenAI to generate the quiz content
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: quizPrompt,
        temperature: 0.7,
        maxTokens: 1500,
      })

      // Parse the JSON response
      quizContent = JSON.parse(text)
    } catch (error) {
      console.error("Error generating quiz content with AI:", error)

      // Fallback quiz if AI generation fails
      quizContent = {
        questions: [
          {
            question: "This is a placeholder question. AI-generated questions could not be created.",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: 0,
            explanation: "This is a placeholder explanation.",
          },
        ],
      }
    }

    // Store the AI-generated content in the database
    const { error: contentError } = await supabaseAdmin.from("lesson_ai_content").insert([
      {
        lesson_id: lessonId,
        content: lessonContent,
        quiz: quizContent,
      },
    ])

    if (contentError) {
      console.error("Error storing AI content:", contentError)
      throw contentError
    }

    // Update lesson to indicate processing is complete
    await supabaseAdmin
      .from("lessons")
      .update({
        ai_processed: true,
        ai_processing_needed: false,
      })
      .eq("id", lessonId)

    console.log(`AI content generation complete for lesson ${lessonId}`)

    return {
      lesson: lessonContent,
      quiz: quizContent,
    }
  } catch (error) {
    console.error("Error in AI lesson generation:", error)
    throw error
  }
}
