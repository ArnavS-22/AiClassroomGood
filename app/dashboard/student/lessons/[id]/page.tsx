"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { ArrowLeft, Loader2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function LessonPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lessonData, setLessonData] = useState<any>(null)

  useEffect(() => {
    if (user && id) {
      fetchLessonData()
    }
  }, [user, id])

  async function fetchLessonData() {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClientComponentClient()

      // Fetch the lesson data
      const { data: lesson, error: lessonError } = await supabase.from("lessons").select("*").eq("id", id).single()

      if (lessonError) {
        throw new Error("Failed to load lesson data")
      }

      setLessonData(lesson)
    } catch (error: any) {
      console.error("Error fetching lesson data:", error)
      setError(error.message || "Failed to load lesson. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading lesson content...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push("/dashboard/student")}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-violet-600 animate-gradient">
            {lessonData?.title || "Lesson"}
          </span>
        </h1>
      </div>

      <div className="max-w-3xl mx-auto">
        <Card className="border border-blue-100 mb-8">
          <CardHeader>
            <CardTitle>AI Lesson Content Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center">
              <h3 className="text-xl font-medium text-blue-800 mb-4">AI-Generated Lesson Content</h3>
              <p className="text-blue-700 mb-6">
                AI-generated lesson content is coming soon. Check back later for interactive lessons.
              </p>
              <Button variant="outline" onClick={() => router.push("/dashboard/student")}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
