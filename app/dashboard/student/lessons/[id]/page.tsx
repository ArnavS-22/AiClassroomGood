"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, AlertCircle, BookOpen, FileText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function StudentLessonPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [lesson, setLesson] = useState<any>(null)
  const [aiContent, setAiContent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("lesson")

  useEffect(() => {
    async function fetchLessonData() {
      if (!user || !id) return

      try {
        setIsLoading(true)
        setError(null)

        console.log(`Fetching lesson data for lesson ID: ${id}`)
        const response = await fetch(`/api/lessons/${id}/ai-content`)

        if (!response.ok) {
          let errorMessage = "Failed to load lesson data"
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
            console.error("Error response:", errorData)
          } catch (e) {
            console.error("Error parsing error response:", e)
          }
          throw new Error(errorMessage)
        }

        const data = await response.json()
        console.log("Lesson data received:", data)

        if (!data.lesson) {
          throw new Error("Lesson not found")
        }

        setLesson(data.lesson)
        setAiContent(data.aiContent)
      } catch (error: any) {
        console.error("Error fetching lesson data:", error)
        setError(error.message || "Failed to load lesson data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchLessonData()
  }, [id, user])

  // Function to trigger AI content generation
  const handleGenerateAIContent = async () => {
    if (!user || !id || !lesson) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/lessons/generate-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId: id,
          teacherId: lesson.teacher_id, // This should be available in the lesson data
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate AI content")
      }

      // Wait a moment to allow processing to start
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Refresh the page to show the processing status
      window.location.reload()
    } catch (error: any) {
      console.error("Error generating AI content:", error)
      setError(error.message || "Failed to generate AI content")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-2">Loading lesson...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <div className="mt-6 text-center">
          <p className="mb-4">The lesson could not be found or there was an error loading it.</p>
          <Button onClick={() => router.push("/dashboard/student")}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Lesson not found</AlertDescription>
        </Alert>
        <div className="mt-6">
          <Button onClick={() => router.push("/dashboard/student")}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 mr-2"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </Button>
        <h1 className="text-3xl font-bold">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-violet-600 animate-gradient">
            {lesson.title || "Lesson"}
          </span>
        </h1>
      </div>

      <Card className="border border-blue-100 mb-6">
        <CardHeader>
          <CardTitle>{lesson.title}</CardTitle>
          <CardDescription>
            Grade: {lesson.grade_level} | Subject: {lesson.subject}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">{lesson.description}</p>
          {lesson.file_url && (
            <Button variant="outline" asChild>
              <a href={lesson.file_url} target="_blank" rel="noopener noreferrer">
                <FileText className="mr-2 h-4 w-4" />
                View Original Lesson Material
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {aiContent ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="lesson">
              <BookOpen className="mr-2 h-4 w-4" />
              Lesson Content
            </TabsTrigger>
            <TabsTrigger value="quiz">
              <FileText className="mr-2 h-4 w-4" />
              Quiz
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lesson">
            <Card className="border border-blue-100">
              <CardContent className="pt-6">
                {aiContent.content &&
                  aiContent.content.sections &&
                  aiContent.content.sections.map((section: any, index: number) => (
                    <div key={index} className="mb-8">
                      <h3 className="text-xl font-semibold mb-3">{section.title}</h3>
                      <p className="mb-4 whitespace-pre-line">{section.content}</p>

                      {section.keyPoints && section.keyPoints.length > 0 && (
                        <div className="mt-4 bg-blue-50 p-4 rounded-md">
                          <h4 className="font-medium mb-2">Key Points:</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {section.keyPoints.map((point: string, i: number) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}

                {aiContent.content && aiContent.content.keyTerms && aiContent.content.keyTerms.length > 0 && (
                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-xl font-semibold mb-4">Key Terms</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {aiContent.content.keyTerms.map((term: any, i: number) => (
                        <div key={i} className="bg-gray-50 p-4 rounded-md">
                          <h4 className="font-medium text-blue-600">{term.term}</h4>
                          <p>{term.definition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quiz">
            <Card className="border border-blue-100">
              <CardHeader>
                <CardTitle>Quiz: Test Your Knowledge</CardTitle>
                <CardDescription>Answer these questions to check your understanding of the lesson.</CardDescription>
              </CardHeader>
              <CardContent>
                {aiContent.quiz &&
                  aiContent.quiz.questions &&
                  aiContent.quiz.questions.map((question: any, qIndex: number) => (
                    <div key={qIndex} className="mb-8 pb-6 border-b last:border-b-0">
                      <h3 className="text-lg font-medium mb-3">
                        {qIndex + 1}. {question.question}
                      </h3>
                      <div className="space-y-2 mb-4">
                        {question.options.map((option: string, oIndex: number) => (
                          <div key={oIndex} className="flex items-start">
                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                oIndex === question.correctAnswer
                                  ? "border-green-500 bg-green-50 text-green-600"
                                  : "border-gray-300"
                              } mr-3`}
                            >
                              {String.fromCharCode(65 + oIndex)}
                            </div>
                            <div>{option}</div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-blue-50 p-4 rounded-md mt-4">
                        <h4 className="font-medium mb-1">Explanation:</h4>
                        <p>{question.explanation}</p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              The interactive lesson content is not available yet.
            </AlertDescription>
          </Alert>

          {lesson.ai_processing_needed && !lesson.ai_processed && (
            <Alert className="bg-blue-50 border-blue-200">
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <AlertDescription className="text-blue-800">
                AI content is currently being generated. Please check back in a few minutes.
              </AlertDescription>
            </Alert>
          )}

          {!lesson.ai_processing_needed && !lesson.ai_processed && (
            <div className="text-center py-4">
              <Button onClick={handleGenerateAIContent} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate AI Content"
                )}
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                Click to generate interactive lesson content based on the original material.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
