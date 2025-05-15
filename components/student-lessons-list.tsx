"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { ClassroomLesson } from "@/lib/types"
import { BookOpen } from "lucide-react"

interface StudentLessonsListProps {
  classroomId?: string
  isLoading: boolean
}

export function StudentLessonsList({ classroomId, isLoading }: StudentLessonsListProps) {
  const { user } = useAuth()
  const [lessons, setLessons] = useState<ClassroomLesson[]>([])
  const [isLoadingLessons, setIsLoadingLessons] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchLessons()
    }
  }, [user, classroomId])

  async function fetchLessons() {
    setIsLoadingLessons(true)
    try {
      // If classroomId is provided, fetch lessons for that classroom
      // Otherwise, fetch all visible lessons for the student across all classrooms
      const url = classroomId
        ? `/api/classroom-lessons?classroomId=${classroomId}&studentId=${user?.id}`
        : `/api/student/lessons`

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch lessons")
      }

      const data = await response.json()
      setLessons(data || [])
    } catch (error: any) {
      console.error("Error fetching lessons:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load your lessons. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingLessons(false)
    }
  }

  if (isLoading || isLoadingLessons) {
    return <div className="text-center py-12">Loading your lessons...</div>
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
      {lessons.map((classroomLesson) => (
        <Card key={classroomLesson.id} className="border border-blue-100">
          <CardHeader>
            <CardTitle>{classroomLesson.lesson?.title}</CardTitle>
            {classroomLesson.classroom && (
              <CardDescription>Classroom: {classroomLesson.classroom.name}</CardDescription>
            )}
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
      ))}
    </div>
  )
}
