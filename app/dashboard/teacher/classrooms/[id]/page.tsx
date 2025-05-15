"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import type { Classroom, User, ClassroomLesson } from "@/lib/types"
import { ArrowLeft, UserPlus, X, Eye, EyeOff, Plus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ClassroomDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [students, setStudents] = useState<(User & { joined_at: string })[]>([])
  const [classroomLessons, setClassroomLessons] = useState<ClassroomLesson[]>([])
  const [availableLessons, setAvailableLessons] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingStudent, setIsAddingStudent] = useState(false)
  const [studentEmail, setStudentEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false)
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false)
  const [selectedLessonId, setSelectedLessonId] = useState<string>("")
  const [isLessonVisible, setIsLessonVisible] = useState(true)
  const [isAddingLesson, setIsAddingLesson] = useState(false)
  const [activeTab, setActiveTab] = useState("students")
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  // Refs to track fetch status and prevent duplicate fetches
  const initialFetchDone = useRef(false)
  const fetchingData = useRef(false)

  useEffect(() => {
    if (user && id && !initialFetchDone.current) {
      initialFetchDone.current = true
      fetchClassroomData()
    }
  }, [user, id])

  async function fetchClassroomData() {
    if (fetchingData.current) {
      console.log("Classroom data fetch already in progress, skipping duplicate request")
      return
    }

    setIsLoading(true)
    fetchingData.current = true

    try {
      console.log(`Fetching classroom data for ID: ${id}`)

      // Use the API endpoint instead of direct Supabase query
      const classroomResponse = await fetch(`/api/classrooms/${id}?teacherId=${user?.id}`)

      if (!classroomResponse.ok) {
        const errorData = await classroomResponse.json()
        if (classroomResponse.status === 404) {
          toast({
            title: "Access denied",
            description: "You don't have permission to view this classroom.",
            variant: "destructive",
          })
          router.push("/dashboard/teacher?tab=classrooms")
          return
        }
        throw new Error(errorData.error || "Failed to fetch classroom data")
      }

      const classroomData = await classroomResponse.json()
      console.log("Fetched classroom data:", classroomData)
      setClassroom(classroomData)

      // Fetch students using the API endpoint
      console.log(`Fetching students for classroom ID: ${id}`)
      const studentsResponse = await fetch(`/api/classrooms/${id}/students`)

      if (!studentsResponse.ok) {
        const errorData = await studentsResponse.json()
        throw new Error(errorData.error || "Failed to fetch students data")
      }

      const studentsData = await studentsResponse.json()
      console.log(`Fetched ${studentsData.length} students`)

      // Format the data
      const formattedStudents = studentsData.map((item: any) => ({
        ...item.student,
        joined_at: item.joined_at,
      }))

      setStudents(formattedStudents)

      // Fetch classroom lessons
      console.log(`Fetching lessons for classroom ID: ${id}`)
      const lessonsResponse = await fetch(`/api/classroom-lessons?classroomId=${id}&teacherId=${user?.id}`)

      if (!lessonsResponse.ok) {
        const errorData = await lessonsResponse.json()
        throw new Error(errorData.error || "Failed to fetch classroom lessons")
      }

      const lessonsData = await lessonsResponse.json()
      console.log(`Fetched ${lessonsData.length} classroom lessons`)
      setClassroomLessons(lessonsData || [])

      // Fetch available lessons (lessons not already in the classroom)
      await fetchAvailableLessons()
    } catch (error: any) {
      console.error("Error fetching classroom data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load classroom data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      fetchingData.current = false
    }
  }

  async function fetchAvailableLessons() {
    if (!user) return

    try {
      // Fetch all lessons for this teacher
      const { data: allLessons, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get the IDs of lessons already in the classroom
      const existingLessonIds = classroomLessons.map((cl) => cl.lesson_id)

      // Filter out lessons already in the classroom
      const availableLessons = (allLessons || []).filter((lesson) => !existingLessonIds.includes(lesson.id))

      setAvailableLessons(availableLessons)
    } catch (error) {
      console.error("Error fetching available lessons:", error)
    }
  }

  async function handleAddStudent() {
    if (!studentEmail.trim()) {
      setError("Please enter a student email.")
      return
    }

    try {
      setIsAddingStudent(true)
      setError(null)

      // First, check if the user exists and is a student
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, role")
        .eq("email", studentEmail)
        .single()

      if (userError) {
        if (userError.code === "PGRST116") {
          setError("No user found with this email. Please make sure the student has signed up.")
        } else {
          throw userError
        }
        return
      }

      if (userData.role !== "student") {
        setError("This user is not registered as a student.")
        return
      }

      // Check if student is already in the classroom
      const { data: existingStudent, error: checkError } = await supabase
        .from("classroom_students")
        .select("*")
        .eq("classroom_id", id)
        .eq("student_id", userData.id)
        .maybeSingle()

      if (checkError) throw checkError

      if (existingStudent) {
        setError("This student is already in this classroom.")
        return
      }

      // Add student to classroom
      const { error: addError } = await supabase.from("classroom_students").insert([
        {
          classroom_id: id,
          student_id: userData.id,
        },
      ])

      if (addError) throw addError

      toast({
        title: "Student added",
        description: "The student has been added to the classroom.",
      })

      setStudentEmail("")
      setIsStudentDialogOpen(false)
      fetchClassroomData()
    } catch (error) {
      console.error("Error adding student:", error)
      setError("Failed to add student. Please try again.")
    } finally {
      setIsAddingStudent(false)
    }
  }

  async function handleRemoveStudent(studentId: string) {
    try {
      const { error } = await supabase
        .from("classroom_students")
        .delete()
        .eq("classroom_id", id)
        .eq("student_id", studentId)

      if (error) throw error

      toast({
        title: "Student removed",
        description: "The student has been removed from the classroom.",
      })

      // Update the students list
      setStudents(students.filter((student) => student.id !== studentId))
    } catch (error) {
      console.error("Error removing student:", error)
      toast({
        title: "Error",
        description: "Failed to remove the student. Please try again.",
        variant: "destructive",
      })
    }
  }

  async function handleAddLesson() {
    if (!selectedLessonId) {
      toast({
        title: "Error",
        description: "Please select a lesson to add to the classroom.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsAddingLesson(true)

      // Add the lesson to the classroom
      const response = await fetch("/api/classroom-lessons/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId: selectedLessonId,
          classroomId: id,
          teacherId: user?.id,
          visible: isLessonVisible,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add lesson to classroom")
      }

      toast({
        title: "Lesson added",
        description: isLessonVisible
          ? "The lesson has been added and is visible to students."
          : "The lesson has been added but is not visible to students yet.",
      })

      setIsLessonDialogOpen(false)
      fetchClassroomData()
    } catch (error: any) {
      console.error("Error adding lesson:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add the lesson. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingLesson(false)
    }
  }

  async function handleToggleLessonVisibility(classroomLesson: ClassroomLesson) {
    try {
      // Update the lesson visibility
      const response = await fetch("/api/classroom-lessons/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId: classroomLesson.lesson_id,
          classroomId: id,
          teacherId: user?.id,
          visible: !classroomLesson.visible,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update lesson visibility")
      }

      toast({
        title: "Visibility updated",
        description: !classroomLesson.visible
          ? "The lesson is now visible to students."
          : "The lesson is now hidden from students.",
      })

      // Update the classroom lessons list
      setClassroomLessons(
        classroomLessons.map((cl) =>
          cl.id === classroomLesson.id ? { ...cl, visible: !classroomLesson.visible } : cl,
        ),
      )
    } catch (error: any) {
      console.error("Error updating lesson visibility:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update lesson visibility. Please try again.",
        variant: "destructive",
      })
    }
  }

  async function handleRemoveLesson(classroomLesson: ClassroomLesson) {
    try {
      // Remove the lesson from the classroom
      const response = await fetch("/api/classroom-lessons/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId: classroomLesson.lesson_id,
          classroomId: id,
          teacherId: user?.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to remove lesson from classroom")
      }

      toast({
        title: "Lesson removed",
        description: "The lesson has been removed from the classroom.",
      })

      // Update the classroom lessons list
      setClassroomLessons(classroomLessons.filter((cl) => cl.id !== classroomLesson.id))

      // Refresh available lessons
      fetchAvailableLessons()
    } catch (error: any) {
      console.error("Error removing lesson:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove the lesson. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading classroom data...</div>
  }

  if (!classroom) {
    return <div className="container mx-auto px-4 py-8 text-center">Classroom not found.</div>
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
              <CardDescription>Manage your classroom settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Description</h3>
                  <p className="mt-1">{classroom.description || "No description provided."}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Created</h3>
                  <p className="mt-1">{new Date(classroom.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Students</h3>
                  <p className="mt-1">{students.length} enrolled</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Lessons</h3>
                  <p className="mt-1">{classroomLessons.length} added</p>
                </div>
                <div className="pt-4">
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`/dashboard/teacher/classrooms/${id}/assignments`}>View Assignments</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
            </TabsList>

            <TabsContent value="students">
              <Card className="border border-blue-100">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Students</CardTitle>
                    <CardDescription>Manage students in this classroom</CardDescription>
                  </div>
                  <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Student
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add Student to Classroom</DialogTitle>
                        <DialogDescription>
                          Enter the email of the student you want to add to this classroom.
                        </DialogDescription>
                      </DialogHeader>
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Input
                            id="student-email"
                            placeholder="student@example.com"
                            className="col-span-4"
                            value={studentEmail}
                            onChange={(e) => setStudentEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleAddStudent}
                          disabled={isAddingStudent}
                          className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
                        >
                          {isAddingStudent ? "Adding..." : "Add Student"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {students.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No students in this classroom yet.</p>
                      <Button variant="outline" className="mt-4" onClick={() => setIsStudentDialogOpen(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Your First Student
                      </Button>
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <div className="grid grid-cols-12 gap-4 p-4 font-medium text-sm text-gray-500 border-b">
                        <div className="col-span-5">Name</div>
                        <div className="col-span-5">Email</div>
                        <div className="col-span-2">Actions</div>
                      </div>
                      {students.map((student) => (
                        <div
                          key={student.id}
                          className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 items-center"
                        >
                          <div className="col-span-5">{student.full_name || "No name provided"}</div>
                          <div className="col-span-5 text-sm">{student.email}</div>
                          <div className="col-span-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-auto"
                              onClick={() => handleRemoveStudent(student.id)}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lessons">
              <Card className="border border-blue-100">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Lessons</CardTitle>
                    <CardDescription>Manage lessons in this classroom</CardDescription>
                  </div>
                  <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Lesson
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add Lesson to Classroom</DialogTitle>
                        <DialogDescription>
                          Select a lesson to add to this classroom. You can control whether students can see this lesson
                          immediately.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="lesson">Select Lesson</Label>
                          <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
                            <SelectTrigger id="lesson">
                              <SelectValue placeholder="Select a lesson" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLessons.length === 0 ? (
                                <SelectItem value="none" disabled>
                                  No available lessons
                                </SelectItem>
                              ) : (
                                availableLessons.map((lesson) => (
                                  <SelectItem key={lesson.id} value={lesson.id}>
                                    {lesson.title}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {availableLessons.length === 0 && (
                            <p className="text-sm text-amber-600 mt-1">
                              No available lessons. All your lessons are already in this classroom or you need to create
                              new lessons.
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="visible" checked={isLessonVisible} onCheckedChange={setIsLessonVisible} />
                          <Label htmlFor="visible">Make lesson visible to students immediately</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleAddLesson}
                          disabled={!selectedLessonId || isAddingLesson}
                          className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
                        >
                          {isAddingLesson ? "Adding..." : "Add Lesson"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {classroomLessons.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No lessons in this classroom yet.</p>
                      <Button variant="outline" className="mt-4" onClick={() => setIsLessonDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Lesson
                      </Button>
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <div className="grid grid-cols-12 gap-4 p-4 font-medium text-sm text-gray-500 border-b">
                        <div className="col-span-5">Title</div>
                        <div className="col-span-3">Visibility</div>
                        <div className="col-span-4">Actions</div>
                      </div>
                      {classroomLessons.map((classroomLesson) => (
                        <div
                          key={classroomLesson.id}
                          className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 items-center"
                        >
                          <div className="col-span-5">{classroomLesson.lesson?.title}</div>
                          <div className="col-span-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                classroomLesson.visible ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {classroomLesson.visible ? "Visible" : "Hidden"}
                            </span>
                          </div>
                          <div className="col-span-4 flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className={
                                classroomLesson.visible
                                  ? "text-amber-600 border-amber-200"
                                  : "text-green-600 border-green-200"
                              }
                              onClick={() => handleToggleLessonVisibility(classroomLesson)}
                            >
                              {classroomLesson.visible ? (
                                <>
                                  <EyeOff className="h-4 w-4 mr-1" />
                                  Hide
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-1" />
                                  Show
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200"
                              onClick={() => handleRemoveLesson(classroomLesson)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
