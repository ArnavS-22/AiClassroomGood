"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { Assignment, User } from "@/lib/types"
import { ArrowLeft, BarChart } from "lucide-react"

interface StudentSubmission {
  student: User
  status: "not_started" | "in_progress" | "completed"
  submitted_at: string | null
}

export default function AssignmentSubmissionsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (user && id) {
      fetchAssignmentData()
    }
  }, [user, id])

  async function fetchAssignmentData() {
    setIsLoading(true)
    try {
      // Use the API endpoint instead of direct Supabase query to avoid RLS recursion
      const response = await fetch(`/api/assignments/${id}?teacherId=${user?.id}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch assignment data")
      }

      const data = await response.json()

      // Verify teacher owns this classroom
      if (data.classroom.teacher_id !== user?.id) {
        toast({
          title: "Access denied",
          description: "You don't have permission to view this assignment.",
          variant: "destructive",
        })
        router.push("/dashboard/teacher?tab=assignments")
        return
      }

      setAssignment(data)

      // Get all students in the classroom and their submissions via API
      const studentsResponse = await fetch(`/api/classrooms/${data.classroom_id}/students`)

      if (!studentsResponse.ok) {
        const errorData = await studentsResponse.json()
        throw new Error(errorData.error || "Failed to fetch classroom students")
      }

      const studentsData = await studentsResponse.json()

      // Get existing submissions via API
      const submissionsResponse = await fetch(`/api/assignments/${id}/submissions`)

      if (!submissionsResponse.ok) {
        const errorData = await submissionsResponse.json()
        throw new Error(errorData.error || "Failed to fetch assignment submissions")
      }

      const submissionsData = await submissionsResponse.json()

      // Format the data
      const formattedSubmissions = studentsData.map((item: any) => {
        const submission = submissionsData?.find((sub: any) => sub.student_id === item.student.id)
        return {
          student: item.student,
          status: submission?.status || "not_started",
          submitted_at: submission?.submitted_at || null,
        }
      })

      setSubmissions(formattedSubmissions)
    } catch (error) {
      console.error("Error fetching assignment data:", error)
      toast({
        title: "Error",
        description: "Failed to load assignment data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading assignment data...</div>
  }

  if (!assignment) {
    return <div className="container mx-auto px-4 py-8 text-center">Assignment not found.</div>
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
            {assignment.title}
          </span>
        </h1>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="border border-blue-100">
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Description</h3>
                  <p className="mt-1">{assignment.description || "No description provided."}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Classroom</h3>
                  <p className="mt-1">{assignment.classroom?.name}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Lesson</h3>
                  <p className="mt-1">{assignment.lesson?.title}</p>
                </div>
                {assignment.due_date && (
                  <div>
                    <h3 className="font-medium text-sm text-gray-500">Due Date</h3>
                    <p className="mt-1">{new Date(assignment.due_date).toLocaleString()}</p>
                  </div>
                )}
                <div className="pt-4 space-y-2">
                  <Button variant="outline" className="w-full" asChild>
                    <a href={assignment.lesson?.file_url} target="_blank" rel="noopener noreferrer">
                      View Lesson Material
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                    onClick={() => router.push(`/dashboard/teacher/assignments/${id}/quiz-results`)}
                  >
                    <BarChart className="h-4 w-4 mr-2" />
                    View Quiz Results
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="border border-blue-100">
            <CardHeader>
              <CardTitle>Student Submissions</CardTitle>
              <CardDescription>Track student progress on this assignment</CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No students in this classroom yet.</p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <div className="grid grid-cols-12 gap-4 p-4 font-medium text-sm text-gray-500 border-b">
                    <div className="col-span-5">Student</div>
                    <div className="col-span-4">Status</div>
                    <div className="col-span-3">Submitted</div>
                  </div>
                  {submissions.map((submission) => (
                    <div
                      key={submission.student.id}
                      className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 items-center"
                    >
                      <div className="col-span-5">
                        <div>{submission.student.full_name || "No name provided"}</div>
                        <div className="text-xs text-gray-500">{submission.student.email}</div>
                      </div>
                      <div className="col-span-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            submission.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : submission.status === "in_progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {submission.status === "completed"
                            ? "Completed"
                            : submission.status === "in_progress"
                              ? "In Progress"
                              : "Not Started"}
                        </span>
                      </div>
                      <div className="col-span-3 text-sm">
                        {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : "-"}
                      </div>
                    </div>
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
