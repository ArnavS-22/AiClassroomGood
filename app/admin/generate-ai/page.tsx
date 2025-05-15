"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function GenerateAIPage() {
  const [lessonId, setLessonId] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [isLoadingLessons, setIsLoadingLessons] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchLessons()
  }, [])

  async function fetchLessons() {
    try {
      setIsLoadingLessons(true)
      const response = await fetch("/api/lessons?limit=50")

      if (!response.ok) {
        throw new Error("Failed to fetch lessons")
      }

      const data = await response.json()
      setLessons(data || [])
    } catch (error) {
      console.error("Error fetching lessons:", error)
      toast({
        title: "Error",
        description: "Failed to load lessons. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingLessons(false)
    }
  }

  async function handleGenerateAI() {
    if (!lessonId) {
      toast({
        title: "Error",
        description: "Please enter a lesson ID",
        variant: "destructive",
      })
      return
    }

    try {
      setIsGenerating(true)
      setError(null)
      setResult(null)

      const response = await fetch("/api/lessons/force-generate-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lessonId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate AI content")
      }

      setResult(data)
      toast({
        title: "Success",
        description: "AI content generated successfully!",
      })
    } catch (error) {
      console.error("Error generating AI content:", error)
      setError(error.message || "Failed to generate AI content")
      toast({
        title: "Error",
        description: error.message || "Failed to generate AI content",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  function handleSelectLesson(id: string) {
    setLessonId(id)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Generate AI Content</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Generate AI Content for Lesson</CardTitle>
            <CardDescription>Enter a lesson ID to generate AI content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lessonId">Lesson ID</Label>
                <Input
                  id="lessonId"
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  placeholder="Enter lesson ID"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleGenerateAI} disabled={isGenerating || !lessonId}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate AI Content"
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Lessons</CardTitle>
            <CardDescription>Select a lesson to generate AI content</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLessons ? (
              <div className="text-center py-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="mt-2">Loading lessons...</p>
              </div>
            ) : lessons.length === 0 ? (
              <p className="text-center py-4">No lessons found</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className={`p-3 rounded-md cursor-pointer hover:bg-gray-100 ${
                      lessonId === lesson.id ? "bg-blue-50 border border-blue-200" : "border"
                    }`}
                    onClick={() => handleSelectLesson(lesson.id)}
                  >
                    <div className="font-medium">{lesson.title}</div>
                    <div className="text-sm text-gray-500 truncate">{lesson.description}</div>
                    <div className="text-xs text-gray-400 mt-1">ID: {lesson.id}</div>
                    <div className="flex items-center mt-2 text-xs">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-1 ${
                          lesson.ai_processed ? "bg-green-500" : "bg-gray-300"
                        }`}
                      ></span>
                      {lesson.ai_processed ? "AI Processed" : "Not Processed"}

                      {lesson.ai_processing_needed && (
                        <span className="ml-2 text-amber-600 flex items-center">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Processing Needed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert className="mt-8 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            AI content generated successfully! You can now view the lesson with AI content.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
