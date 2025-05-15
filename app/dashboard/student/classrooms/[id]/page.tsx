"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { Classroom, Assignment, ClassroomLesson } from "@/lib/types"
import { ArrowLeft, BookOpen, BrainCircuit, Clock, AlertCircle } from "lucide-react"

export default function StudentClassroomPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [classroomLessons, setClassroomLessons] = useState<ClassroomLesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (user && id) {
      fetchClassroomData()
    }
  }, [user, id])

  // Helper function to safely parse JSON responses
  async function safeJsonParse(response: Response) {
    try {
      const text = await response.text()
      try {
        return JSON.parse(text)
      } catch (e) {
        console.error("Failed to parse JSON response:", text)
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`)
      }
    } catch (e) {
      console.error("Failed to read response text:", e)
      throw new Error("Failed to read response")
    }
  }

  async function fetchClassroomData() {
    setIsLoading(true)
    setError(null)

    try {
      if (!user?.id) {
        throw new Error("User not authenticated")
      }

      console.log(`Fetching data for classroom ${id} as student ${user.id}`)

      // Fetch classroom details
      try {
        const classroomResponse = await fetch(`/api/student/classroom?classroomId=${id}&studentId=${user.id}`)

        if (!classroomResponse.ok) {
          const errorData = await safeJsonParse(classroomResponse)
          throw new Error(errorData.error || `Failed to load classroom data: ${classroomResponse.status}`)
        }

        const classroomData = await safeJsonParse(classroomResponse)
        setClassroom(classroomData)
      } catch (err: any) {
        console.error("Error fetching classroom:", err)
        throw new Error(err.message || "Failed to load classroom data")
      }

      // Fetch assignments
      try {
        const assignmentsResponse = await fetch(
          `/api/student/classroom-assignments?classroomId=${id}&studentId=${user.id}`,
        )

        if (!assignmentsResponse.ok) {
          const errorData = await safeJsonParse(assignmentsResponse)
          console.error("Failed to load assignments:", errorData)
          // Don't throw here, just log the error and continue
        } else {
          const assignmentsData = await safeJsonParse(assignmentsResponse)
          setAssignments(assignmentsData || [])
        }
      } catch (err: any) {
        console.error("Error fetching assignments:", err)
        toast({
          title: "Warning",
          description: "Could not load assignments. Some features may be limited.",
          variant: "destructive",
        })
      }

      // Fetch visible classroom lessons
      try {
        console.log(`Fetching lessons for classroom ${id} as student ${user.id}`)
        const lessonsResponse = await fetch(`/api/classroom-lessons?classroomId=${id}&studentId=${user.id}`)

        if (!lessonsResponse.ok) {
          const errorText = await lessonsResponse.text()
          console.error(`Failed to load lessons (${lessonsResponse.status}):`, errorText)
          toast({
            title: "Warning",
            description: `Could not load lessons: ${lessonsResponse.status}`,
            variant: "destructive",
          })
        } else {
          try {
            const lessonsData = await safeJsonParse(lessonsResponse)
            console.log(`Loaded ${lessonsData.length} lessons`)
            setClassroomLessons(lessonsData || [])
          } catch (parseError: any) {
            console.error("Error parsing lessons response:", parseError)
            toast({
              title: "Warning",
              description: "Could not parse lessons data. Some features may be limited.",
              variant: "destructive",
            })
          }
        }
      } catch (lessonError: any) {
        console.error("Exception fetching classroom lessons:", lessonError)
        toast({
          title: "Warning",
          description: "Could not load lessons. Some features may be limited.",
          variant: "destructive",
        })
      }

      console.log(
        `Successfully loaded classroom ${id} with ${assignments.length} assignments and ${classroomLessons.length} lessons`,
      )
    } catch (err: any) {
      console.error("Error fetching classroom data:", err)
      setError(err.message || "An error occurred while loading classroom data")
      toast({
        title: "Error",
        description: err.message || "Failed to load classroom data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Loading classroom...</h1>
        </div>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading classroom data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-red-500">Error</h1>
        </div>
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Failed to load classroom</h2>
            <p className="text-gray-700">{error}</p>
            <Button onClick={() => fetchClassroomData()} className="mt-4 bg-blue-500 hover:bg-blue-600">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!classroom) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Classroom not found</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p>This classroom does not exist or you do not have access to it.</p>
            <Button onClick={() => router.push("/dashboard/student")} className="mt-4">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
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
            {classroom.name}
          </span>
        </h1>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="border border-blue-100">
            <CardHeader>
              <CardTitle>Classroom Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Description</h3>
                  <p className="mt-1">{classroom.description || "No description provided."}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Teacher</h3>
                  <p className="mt-1">
                    {classroom.teacher?.full_name || classroom.teacher?.email || "Unknown Teacher"}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Joined</h3>
                  <p className="mt-1">{new Date(classroom.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          {/* Lessons Section */}
          <Card className="border border-blue-100 mb-8">
            <CardHeader>
              <CardTitle>Lessons</CardTitle>
              <CardDescription>Available lessons in this classroom</CardDescription>
            </CardHeader>
            <CardContent>
              {classroomLessons.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No lessons available in this classroom yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {classroomLessons.map((classroomLesson) => (
                    <Card key={classroomLesson.id} className="border border-blue-100">
                      <CardHeader>
                        <CardTitle>{classroomLesson.lesson?.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500">
                          {classroomLesson.lesson?.description || "No description provided."}
                        </p>
                      </CardContent>
                      <div className="px-6 pb-4 flex flex-wrap gap-2">
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
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignments Section */}
          <Card className="border border-blue-100">
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Your assignments for this classroom</CardDescription>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No assignments in this classroom yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <Card key={assignment.id} className="border border-blue-100">
                      <CardHeader>
                        <CardTitle>{assignment.title}</CardTitle>
                        {assignment.due_date && (
                          <CardDescription className="flex items-center text-amber-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500">{assignment.description || "No description provided."}</p>
                        <div className="mt-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              assignment.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : assignment.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {assignment.status === "completed"
                              ? "Completed"
                              : assignment.status === "in_progress"
                                ? "In Progress"
                                : "Not Started"}
                          </span>
                        </div>
                      </CardContent>
                      <div className="px-6 pb-4 flex flex-wrap gap-2">
                        {assignment.lesson?.file_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={assignment.lesson.file_url} target="_blank" rel="noopener noreferrer">
                              View Lesson
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-violet-200 text-violet-700 hover:bg-violet-50"
                          asChild
                        >
                          <Link href={`/dashboard/student/lessons/${assignment.id}`}>
                            <BookOpen className="h-4 w-4 mr-1" />
                            View AI Lesson
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-amber-200 text-amber-700 hover:bg-amber-50"
                          asChild
                        >
                          <Link href={`/dashboard/student/assignments/${assignment.id}/quiz`}>
                            <BrainCircuit className="h-4 w-4 mr-1" />
                            Test Knowledge
                          </Link>
                        </Button>
                        {assignment.lesson?.id && (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
                            asChild
                          >
                            <Link href={`/chat/${assignment.lesson.id}`}>
                              <BookOpen className="h-4 w-4 mr-1" />
                              Ask AI
                            </Link>
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
