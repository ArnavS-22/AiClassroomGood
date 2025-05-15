"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Lesson, Classroom, Assignment } from "@/lib/types"
import { LessonUploadForm } from "@/components/lesson-upload-form"
import { ClassroomsList } from "@/components/classrooms-list"
import { CreateClassroomForm } from "@/components/create-classroom-form"
import { AssignmentsList } from "@/components/assignments-list"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"

// Helper function to debounce function calls
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export default function TeacherDashboard() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const router = useRouter()

  const { user } = useAuth()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(tabParam || "lessons")
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  // State for the assign lesson modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("")
  const [isLessonVisible, setIsLessonVisible] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(false)
  const [classroomFetchError, setClassroomFetchError] = useState<string | null>(null)
  const [isRefreshingClassrooms, setIsRefreshingClassrooms] = useState(false)

  // Refs to track fetch status and prevent duplicate fetches
  const initialFetchDone = useRef(false)
  const fetchingClassrooms = useRef(false)
  const fetchingLessons = useRef(false)
  const fetchingAssignments = useRef(false)
  const lastClassroomFetch = useRef(0)

  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/dashboard/teacher?tab=${value}`, { scroll: false })
  }

  // Initial data fetch
  useEffect(() => {
    if (user && !initialFetchDone.current) {
      initialFetchDone.current = true
      fetchData()
    }
  }, [user])

  async function fetchData() {
    setIsLoading(true)
    try {
      await Promise.all([fetchLessons(), fetchClassrooms(true), fetchAssignments()])
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchLessons() {
    if (!user || fetchingLessons.current) return

    try {
      fetchingLessons.current = true
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setLessons(data || [])
    } catch (error) {
      console.error("Error fetching lessons:", error)
      toast({
        title: "Error",
        description: "Failed to load your lessons. Please try again.",
        variant: "destructive",
      })
    } finally {
      fetchingLessons.current = false
    }
  }

  // Force refresh classrooms using the API route
  async function forceRefreshClassrooms() {
    if (!user) return

    try {
      setIsRefreshingClassrooms(true)
      console.log("Force refreshing classrooms via API")

      // Use the API route with force refresh parameter
      const timestamp = Date.now()
      const response = await fetch(`/api/teacher/get-classrooms?teacherId=${user.id}&nocache=${timestamp}&force=true`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`

        try {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } else {
            const errorText = await response.text()
            errorMessage = errorText.length > 100 ? `${errorText.substring(0, 100)}...` : errorText
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError)
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log(`Force refreshed ${data.length} classrooms via API:`, data)

      // Update the classrooms state with the verified data
      setClassrooms(data || [])
      lastClassroomFetch.current = Date.now()
    } catch (error: any) {
      console.error("Error force refreshing classrooms:", error)
      setClassroomFetchError(error.message || "Failed to refresh classrooms. Please try again.")
    } finally {
      setIsRefreshingClassrooms(false)
    }
  }

  async function fetchClassrooms(forceRefresh = false) {
    if (!user) return

    // Prevent duplicate fetches unless forced
    if (fetchingClassrooms.current && !forceRefresh) {
      console.log("Classroom fetch already in progress, skipping duplicate request")
      return
    }

    // Use cached data if it's recent (within 30 seconds) unless forced refresh
    const now = Date.now()
    if (!forceRefresh && now - lastClassroomFetch.current < 30000 && classrooms.length > 0) {
      console.log("Using cached classroom data (fetched within last 30 seconds)")
      return
    }

    try {
      setIsLoadingClassrooms(true)
      setClassroomFetchError(null)
      fetchingClassrooms.current = true

      console.log(`${forceRefresh ? "Force refreshing" : "Fetching"} classrooms for teacher:`, user.id)

      // Use the API route with cache busting
      const timestamp = Date.now()
      const cacheParam = forceRefresh ? `&nocache=${timestamp}` : ""
      const response = await fetch(`/api/teacher/get-classrooms?teacherId=${user.id}${cacheParam}`, {
        method: "GET",
        headers: forceRefresh
          ? {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            }
          : {},
      })

      // Check if the response is OK
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`

        try {
          // Try to parse as JSON first
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } else {
            // If not JSON, get the text
            const errorText = await response.text()
            // Truncate long HTML responses
            errorMessage = errorText.length > 100 ? `${errorText.substring(0, 100)}...` : errorText
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError)
        }

        throw new Error(errorMessage)
      }

      // Parse the JSON response
      const data = await response.json()
      console.log(`Fetched ${data.length} classrooms:`, data)

      // Validate the response data
      if (!Array.isArray(data)) {
        console.error("Invalid classroom data format:", data)
        throw new Error("Invalid classroom data format received from server")
      }

      setClassrooms(data)
      lastClassroomFetch.current = now
    } catch (error: any) {
      console.error("Error fetching classrooms:", error)
      setClassroomFetchError(error.message || "Failed to load your classrooms. Please try again.")
    } finally {
      setIsLoadingClassrooms(false)
      fetchingClassrooms.current = false
    }
  }

  // Debounced version of fetchClassrooms to prevent rapid successive calls
  const debouncedFetchClassrooms = debounce((forceRefresh: boolean) => {
    fetchClassrooms(forceRefresh)
  }, 300)

  async function fetchAssignments() {
    if (!user || fetchingAssignments.current) return

    try {
      fetchingAssignments.current = true
      // Use API route with service role key
      const timestamp = Date.now()
      const response = await fetch(`/api/assignments?teacherId=${user.id}&t=${timestamp}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to fetch assignments: ${response.status}`)
        } else {
          const errorText = await response.text()
          throw new Error(`Failed to fetch assignments: ${response.status} - ${errorText.substring(0, 100)}...`)
        }
      }

      const data = await response.json()
      setAssignments(data || [])
    } catch (error: any) {
      console.error("Error fetching assignments:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load your assignments. Please try again.",
        variant: "destructive",
      })
    } finally {
      fetchingAssignments.current = false
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    try {
      const lessonToDelete = lessons.find((lesson) => lesson.id === lessonId)

      if (!lessonToDelete) {
        throw new Error("Lesson not found")
      }

      // Delete the file from storage if it exists
      if (lessonToDelete.file_url) {
        // Extract the file path from the URL
        const filePathMatch = lessonToDelete.file_url.match(/\/storage\/v1\/object\/public\/lesson-files\/(.+)/)
        if (filePathMatch && filePathMatch[1]) {
          const filePath = filePathMatch[1]
          const { error: storageError } = await supabase.storage.from("lesson-files").remove([filePath])

          if (storageError) {
            console.error("Error deleting file from storage:", storageError)
          }
        }
      }

      // Delete the lesson record from the database
      const { error } = await supabase.from("lessons").delete().eq("id", lessonId)

      if (error) throw error

      // Update the lessons state
      setLessons(lessons.filter((lesson) => lesson.id !== lessonId))

      toast({
        title: "Lesson deleted",
        description: "The lesson has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting lesson:", error)
      toast({
        title: "Error",
        description: "Failed to delete the lesson. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLessonUploaded = () => {
    fetchLessons()
    handleTabChange("lessons")
  }

  const handleClassroomCreated = (newClassroom: Classroom) => {
    console.log("New classroom created:", newClassroom)

    // Directly update the state with the new classroom
    setClassrooms((prevClassrooms) => [newClassroom, ...prevClassrooms])

    // Then change the tab
    handleTabChange("classrooms")
  }

  // Function to open the assign modal
  const handleOpenAssignModal = async (lessonId: string) => {
    setSelectedLessonId(lessonId)
    setSelectedClassroomId("")
    setIsLessonVisible(true)
    setIsAssignModalOpen(true)

    // Force refresh classrooms to ensure we have the latest data
    await fetchClassrooms(true)
  }

  // Function to handle adding a lesson to a classroom
  const handleAddLessonToClassroom = async () => {
    if (!user || !selectedLessonId || !selectedClassroomId) {
      toast({
        title: "Error",
        description: "Please select a classroom to add this lesson to.",
        variant: "destructive",
      })
      return
    }

    // Verify the classroom exists before proceeding
    const classroomExists = classrooms.some((classroom) => classroom.id === selectedClassroomId)
    if (!classroomExists) {
      toast({
        title: "Error",
        description: "The selected classroom no longer exists. Please refresh the list and try again.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsAssigning(true)

      console.log("Adding lesson to classroom:", {
        lessonId: selectedLessonId,
        classroomId: selectedClassroomId,
        teacherId: user.id,
        visible: isLessonVisible,
      })

      // Add the lesson to the classroom using the API
      const response = await fetch("/api/classroom-lessons/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId: selectedLessonId,
          classroomId: selectedClassroomId,
          teacherId: user.id,
          visible: isLessonVisible,
        }),
      })

      // Check if the response is OK
      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        let errorData

        try {
          // Try to parse as JSON if it's JSON content
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json()
            console.error("API error response:", errorData)
          } else {
            // If not JSON, get a small sample of the text to avoid large HTML dumps
            const errorText = await response.text()
            console.error("Non-JSON error response:", errorText.substring(0, 200))
            errorData = { error: `Server error (${response.status}). Check console for details.` }
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError)
          errorData = { error: `Failed to parse error response: ${parseError}` }
        }

        throw new Error(errorData?.error || `Server error: ${response.status} ${response.statusText}`)
      }

      // Parse the JSON response
      const data = await response.json()
      console.log("Added lesson to classroom:", data)

      // Close the modal
      setIsAssignModalOpen(false)

      // Show success message
      toast({
        title: "Lesson added to classroom!",
        description: isLessonVisible
          ? "The lesson is now visible to students in the selected classroom."
          : "The lesson has been added to the classroom but is not visible to students yet.",
      })

      // Switch to classrooms tab
      handleTabChange("classrooms")
    } catch (error: any) {
      console.error("Error adding lesson to classroom:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add the lesson to the classroom. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAssigning(false)
    }
  }

  // Function to check if a classroom ID exists in the API
  async function checkClassroomExists(classroomId: string) {
    if (!user || !classroomId) return false

    try {
      console.log(`Checking if classroom ${classroomId} exists via API`)
      const response = await fetch(`/api/classrooms/${classroomId}?teacherId=${user.id}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      return !!data
    } catch (error) {
      console.error(`Error checking if classroom ${classroomId} exists:`, error)
      return false
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-violet-600 animate-gradient">
          Teacher Dashboard
        </span>
      </h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-8">
          <TabsTrigger value="lessons">My Lessons</TabsTrigger>
          <TabsTrigger value="classrooms">My Classrooms</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="upload">Upload Lesson</TabsTrigger>
          <TabsTrigger value="create-classroom">Create Classroom</TabsTrigger>
        </TabsList>

        <TabsContent value="lessons">
          {isLoading ? (
            <div className="text-center py-12">Loading your lessons...</div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">You haven't uploaded any lessons yet.</p>
              <Button variant="outline" onClick={() => handleTabChange("upload")}>
                Upload Your First Lesson
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map((lesson) => (
                <Card key={lesson.id} className="border border-blue-100">
                  <CardHeader>
                    <CardTitle>{lesson.title}</CardTitle>
                    <CardDescription>
                      Grade: {lesson.grade_level} | Subject: {lesson.subject}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500 line-clamp-3">{lesson.description}</p>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" size="sm" asChild>
                      <a href={lesson.file_url} target="_blank" rel="noopener noreferrer">
                        View File
                      </a>
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200"
                        onClick={() => handleOpenAssignModal(lesson.id)}
                      >
                        Add to Class
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200"
                        onClick={() => handleDeleteLesson(lesson.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium mb-2">🔜 AI Placeholder</h3>
            <p>This section will later let teachers use AI to auto-generate or improve lesson content.</p>
          </div>
        </TabsContent>

        <TabsContent value="classrooms">
          <ClassroomsList
            classrooms={classrooms}
            isLoading={isLoading}
            onCreateClassroom={() => handleTabChange("create-classroom")}
            onRefresh={() => debouncedFetchClassrooms(true)}
          />

          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium mb-2">🔜 Future Features</h3>
            <p>Student list + classroom analytics will appear here.</p>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsList
            assignments={assignments}
            lessons={lessons}
            classrooms={classrooms}
            isLoading={isLoading}
            onRefresh={fetchAssignments}
          />

          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium mb-2">🔜 AI Placeholder</h3>
            <p>This will later allow teachers to auto-generate quizzes or homework from lesson data.</p>
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <Card className="border border-blue-100">
            <CardHeader>
              <CardTitle>Upload New Lesson</CardTitle>
              <CardDescription>Upload your lesson materials to make them available to your students.</CardDescription>
            </CardHeader>
            <CardContent>
              <LessonUploadForm onSuccess={handleLessonUploaded} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create-classroom">
          <Card className="border border-blue-100">
            <CardHeader>
              <CardTitle>Create New Classroom</CardTitle>
              <CardDescription>Create a classroom to organize your students and assign lessons.</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateClassroomForm onSuccess={handleClassroomCreated} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Lesson to Classroom Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lesson to Classroom</DialogTitle>
            <DialogDescription>
              Select a classroom to add this lesson to. You can control whether students can see this lesson
              immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {classroomFetchError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{classroomFetchError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="classroom">Select Classroom</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => forceRefreshClassrooms()}
                    disabled={isRefreshingClassrooms}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {isRefreshingClassrooms ? "Refreshing..." : "Force Refresh"}
                  </Button>
                </div>
              </div>

              <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
                <SelectTrigger id="classroom">
                  <SelectValue placeholder={isLoadingClassrooms ? "Loading classrooms..." : "Select a classroom"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingClassrooms || isRefreshingClassrooms ? (
                    <SelectItem value="loading" disabled>
                      Loading classrooms...
                    </SelectItem>
                  ) : classrooms.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No classrooms available
                    </SelectItem>
                  ) : (
                    classrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {classrooms.length === 0 && !isLoadingClassrooms && !isRefreshingClassrooms && !classroomFetchError && (
                <p className="text-sm text-amber-600 mt-1">
                  No classrooms found. Please create a classroom first or try refreshing the list.
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="visible" checked={isLessonVisible} onCheckedChange={setIsLessonVisible} />
              <Label htmlFor="visible">Make lesson visible to students immediately</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddLessonToClassroom}
                disabled={!selectedClassroomId || isAssigning || isLoadingClassrooms || isRefreshingClassrooms}
                className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
              >
                {isAssigning ? "Adding..." : "Add to Classroom"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
