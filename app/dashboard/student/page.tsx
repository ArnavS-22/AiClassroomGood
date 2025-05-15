"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { StudentLessonsList } from "@/components/student-lessons-list"
import { Activity } from "lucide-react"

interface Classroom {
  id: string
  name: string
  grade_level?: string
  teacher_id: string
  teacher_name?: string
  created_at: string
}

interface Assignment {
  id: string
  title: string
  description: string
  due_date: string
  classroom_id: string
  lesson_id: string
  created_at: string
  classroom?: {
    name: string
  }
  lesson?: {
    title: string
  }
  status?: string
}

export default function StudentDashboard() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const router = useRouter()

  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(tabParam || "classrooms")
  const [joinCode, setJoinCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const { toast } = useToast()

  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/dashboard/student?tab=${value}`, { scroll: false })
  }

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  async function fetchData() {
    setIsLoading(true)
    try {
      await Promise.all([fetchClassrooms(), fetchAssignments()])
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchClassrooms() {
    if (!user) return

    try {
      console.log("Fetching classrooms for student:", user.id)

      // Use the API route instead of direct Supabase queries
      const response = await fetch(`/api/student-classrooms?studentId=${user.id}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch classrooms")
      }

      const data = await response.json()
      console.log(`Fetched ${data.length} classrooms for student ${user.id}`)

      setClassrooms(data || [])
    } catch (error: any) {
      console.error("Error fetching classrooms:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load your classrooms. Please try again.",
        variant: "destructive",
      })
    }
  }

  async function fetchAssignments() {
    if (!user) return

    try {
      console.log("Fetching assignments for student:", user.id)

      // Use the API route instead of direct Supabase queries
      const response = await fetch(`/api/student-assignments?studentId=${user.id}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch assignments")
      }

      const data = await response.json()
      console.log(`Fetched ${data.length} assignments for student ${user.id}`)

      setAssignments(data || [])
    } catch (error: any) {
      console.error("Error fetching assignments:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load your assignments. Please try again.",
        variant: "destructive",
      })
    }
  }

  async function handleJoinClassroom() {
    if (!joinCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid join code.",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to join a classroom.",
        variant: "destructive",
      })
      return
    }

    setIsJoining(true)

    try {
      console.log(`Submitting join request for code: ${joinCode} and student: ${user.id}`)

      // Use the API route instead of direct Supabase queries
      const response = await fetch("/api/classrooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          joinCode: joinCode.trim(),
          studentId: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to join classroom")
      }

      console.log("Join classroom response:", data)

      toast({
        title: "Success!",
        description: `You have joined ${data.classroom.name}.`,
      })

      // Reset the join code and refresh the data
      setJoinCode("")
      fetchData()
    } catch (error: any) {
      console.error("Error joining classroom:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to join the classroom. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-violet-600 animate-gradient">
          Student Dashboard
        </span>
      </h1>

      <div className="mb-6">
        <Button variant="outline" asChild className="text-blue-600 border-blue-200">
          <Link href="/dashboard/student/stream" className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            View your learning stream
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-8">
          <TabsTrigger value="classrooms">My Classrooms</TabsTrigger>
          <TabsTrigger value="lessons">My Lessons</TabsTrigger>
          <TabsTrigger value="assignments">My Assignments</TabsTrigger>
          <TabsTrigger value="join">Join Classroom</TabsTrigger>
        </TabsList>

        <TabsContent value="classrooms">
          {isLoading ? (
            <div className="text-center py-12">Loading your classrooms...</div>
          ) : classrooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">You haven't joined any classrooms yet.</p>
              <Button variant="outline" onClick={() => handleTabChange("join")}>
                Join a Classroom
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classrooms.map((classroom) => (
                <Card key={classroom.id} className="border border-blue-100">
                  <CardHeader>
                    <CardTitle>{classroom.name}</CardTitle>
                    {/* Only show grade level if it exists */}
                    {classroom.grade_level && <CardDescription>Grade: {classroom.grade_level}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">Teacher: {classroom.teacher_name}</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/student/classrooms/${classroom.id}`}>View Classroom</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium mb-2">🔜 AI Placeholder</h3>
            <p>This will be a GPT-powered tutor where students can ask lesson-specific questions.</p>
          </div>
        </TabsContent>

        <TabsContent value="lessons">
          <StudentLessonsList isLoading={isLoading} />

          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium mb-2">🔜 AI Placeholder</h3>
            <p>This will be a GPT-powered tutor where students can ask lesson-specific questions.</p>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          {isLoading ? (
            <div className="text-center py-12">Loading your assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">You don't have any assignments yet.</p>
              <Button variant="outline" onClick={() => handleTabChange("classrooms")}>
                View Your Classrooms
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignments.map((assignment) => (
                <Card key={assignment.id} className="border border-blue-100">
                  <CardHeader>
                    <CardTitle>{assignment.title}</CardTitle>
                    <CardDescription>Due: {new Date(assignment.due_date).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 mb-2">Classroom: {assignment.classroom?.name}</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Lesson: {assignment.lesson?.title || "No lesson attached"}
                    </p>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">Status:</span>
                      <span
                        className={`text-sm px-2 py-1 rounded ${
                          assignment.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : assignment.status === "in_progress"
                              ? "bg-yellow-100 text-yellow-800"
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
                  <CardFooter>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/student/assignments/${assignment.id}`}>View Assignment</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium mb-2">🔜 AI Placeholder</h3>
            <p>This will offer automatic feedback or grading hints based on lesson content.</p>
          </div>
        </TabsContent>

        <TabsContent value="join">
          <Card className="border border-blue-100 max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Join a Classroom</CardTitle>
              <CardDescription>Enter the join code provided by your teacher to join a classroom.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label htmlFor="join-code" className="block text-sm font-medium text-gray-700 mb-1">
                    Join Code
                  </label>
                  <input
                    id="join-code"
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    maxLength={10}
                  />
                </div>
                <Button onClick={handleJoinClassroom} disabled={isJoining || !joinCode.trim()}>
                  {isJoining ? "Joining..." : "Join"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
