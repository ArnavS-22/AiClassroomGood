"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { ClassroomLesson } from "@/lib/types"
import { BookOpen, AlertCircle, RefreshCw } from "lucide-react"

interface StudentLessonsListProps {
  classroomId?: string
  isLoading: boolean
}

export function StudentLessonsList({ classroomId, isLoading: parentIsLoading }: StudentLessonsListProps) {
  const { user } = useAuth()
  const [lessons, setLessons] = useState<ClassroomLesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    // Only fetch lessons if user is available
    if (user?.id) {
      fetchLessons()
    } else {
      setIsLoading(false)
      setError("User not authenticated")
    }
  }, [user?.id, classroomId, retryCount]) // Added retryCount to dependencies

  async function fetchLessons() {
    setIsLoading(true)
    setError(null)

    try {
      if (!user?.id) {
        throw new Error("User not authenticated")
      }

      console.log(`Fetching lessons for student ${user.id}${classroomId ? ` in classroom ${classroomId}` : ""}`)

      // If classroomId is provided, fetch lessons for that classroom
      // Otherwise, fetch all visible lessons for the student across all classrooms
      const url = classroomId
        ? `/api/classroom-lessons?classroomId=${classroomId}&studentId=${user.id}`
        : `/api/student/lessons?studentId=${user.id}`

      const response = await fetch(url)
      const responseText = await response.text()

      if (!response.ok) {
        let errorMessage = "Failed to fetch lessons"

        try {
          const errorData = JSON.parse(responseText)
          errorMessage = `${errorMessage}: ${errorData.error || response.statusText}`
        } catch (e) {
          errorMessage = `${errorMessage}: ${responseText.substring(0, 100) || response.statusText}`
        }

        throw new Error(errorMessage)
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error("Failed to parse lessons response:", responseText)
        throw new Error("Invalid response format")
      }

      if (!Array.isArray(data)) {
        console.error("Expected array but got:", typeof data, data)
        throw new Error("Invalid response format: expected an array")
      }

      console.log(`Fetched ${data.length} lessons for student ${user.id}`)
      setLessons(data || [])
    } catch (error: any) {
      console.error("Error fetching lessons:", error)
      setError(error.message || "Failed to load your lessons")
      toast({
        title: "Error",
        description: error.message || "Failed to load your lessons. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleRetry() {
    if (user?.id) {
      setRetryCount((prev) => prev + 1) // This will trigger the useEffect
    }
  }

  // Show loading state if parent is loading or we're loading
  if (parentIsLoading || (isLoading && !error)) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p>Loading your lessons...</p>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button variant="outline" onClick={handleRetry} disabled={!user?.id}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  if (!user?.id) {
    return (
      <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-yellow-600 mb-4">Please log in to view your lessons</p>
        <Button variant="outline" asChild>
          <Link href="/login">Log In</Link>
        </Button>
      </div>
    )
  }

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 mb-4">You don't have any lessons yet.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/student?tab=classrooms">View Your Classrooms</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {lessons.map((classroomLesson) => {
        // Skip rendering if lesson or classroom is missing
        if (!classroomLesson?.lesson || !classroomLesson?.classroom) {
          return null
        }

        return (
          <Card key={classroomLesson.id} className="border border-blue-100">
            <CardHeader>
              <CardTitle>{classroomLesson.lesson?.title || "Untitled Lesson"}</CardTitle>
              <CardDescription>Classroom: {classroomLesson.classroom?.name || "Unknown Classroom"}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 line-clamp-3">
                {classroomLesson.lesson?.description || "No description provided."}
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              {classroomLesson.lesson?.file_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={classroomLesson.lesson.file_url} target="_blank" rel="noopener noreferrer">
                    View Lesson
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
                asChild
              >
                <Link href={`/chat/${classroomLesson.lesson?.id}`}>
                  <BookOpen className="h-4 w-4 mr-1" />
                  Ask AI
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
