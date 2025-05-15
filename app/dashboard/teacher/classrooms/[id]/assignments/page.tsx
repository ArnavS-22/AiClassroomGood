"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { Classroom, Assignment, Lesson } from "@/lib/types"
import { ArrowLeft, PlusCircle, Clock, BookOpen } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Checkbox } from "@/components/ui/checkbox"

// Define the form schema with validation
const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  attach_lesson: z.boolean().default(false),
  lesson_id: z.string().optional(),
  due_date: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export default function ClassroomAssignmentsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      attach_lesson: false,
      lesson_id: "",
      due_date: "",
    },
  })

  // Watch the attach_lesson field to conditionally show/hide the lesson selection
  const attachLesson = form.watch("attach_lesson")

  useEffect(() => {
    if (user && id) {
      fetchData()
    }
  }, [user, id])

  async function fetchData() {
    setIsLoading(true)
    try {
      // Use the API endpoint instead of direct Supabase queries
      const response = await fetch(`/api/classrooms/${id}/assignments?teacherId=${user?.id}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch data")
      }

      const data = await response.json()

      setClassroom(data.classroom)
      setAssignments(data.assignments || [])
      setLessons(data.lessons || [])
    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load data. Please try again.",
        variant: "destructive",
      })

      // Redirect to dashboard if access is denied
      if (error.message.includes("access denied") || error.message.includes("not found")) {
        router.push("/dashboard/teacher?tab=classrooms")
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmit(values: FormValues) {
    if (!user || !classroom) {
      toast({
        title: "Error",
        description: "You must be logged in to create an assignment.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreating(true)

      // Use the API endpoint for assignment creation
      const response = await fetch("/api/assignments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: values.title,
          description: values.description || null,
          classroom_id: id,
          lesson_id: values.attach_lesson ? values.lesson_id : null, // Only include lesson_id if attach_lesson is true
          due_date: values.due_date || null,
          teacher_id: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create assignment")
      }

      // Show success message and reset form
      toast({
        title: "Assignment created!",
        description: "Your assignment has been successfully created.",
      })

      form.reset()
      setIsDialogOpen(false)
      fetchData()
    } catch (error: any) {
      console.error("Error creating assignment:", error)
      toast({
        title: "Error",
        description: error.message || "There was a problem creating your assignment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDeleteAssignment(assignmentId: string) {
    try {
      setIsDeleting(assignmentId)

      // Use a dedicated API endpoint for deletion
      const response = await fetch(`/api/assignments/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentId,
          teacherId: user?.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete assignment")
      }

      toast({
        title: "Assignment deleted",
        description: "The assignment has been successfully deleted.",
      })

      // Refresh the assignments list
      setAssignments(assignments.filter((assignment) => assignment.id !== assignmentId))
    } catch (error: any) {
      console.error("Error deleting assignment:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete the assignment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading data...</div>
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
            {classroom.name}: Assignments
          </span>
        </h1>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Assignments</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
              <DialogDescription>Create an assignment for this classroom.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignment Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Complete Chapter 1 Exercises" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Read the lesson and complete the exercises..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attach_lesson"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Attach a Lesson</FormLabel>
                        <p className="text-sm text-gray-500">Optionally attach a lesson to this assignment</p>
                      </div>
                    </FormItem>
                  )}
                />

                {attachLesson && (
                  <FormField
                    control={form.control}
                    name="lesson_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lesson</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select lesson" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {lessons.length === 0 ? (
                              <SelectItem value="no-lessons" disabled>
                                No lessons available
                              </SelectItem>
                            ) : (
                              lessons.map((lesson) => (
                                <SelectItem key={lesson.id} value={lesson.id}>
                                  {lesson.title}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="mt-6">
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
                    disabled={isCreating}
                  >
                    {isCreating ? "Creating..." : "Create Assignment"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">You haven't created any assignments for this classroom yet.</p>
          <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Your First Assignment
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="border border-blue-100">
              <CardHeader>
                <CardTitle>{assignment.title}</CardTitle>
                <CardDescription>
                  <div className="flex flex-col gap-1 mt-1">
                    {assignment.lesson && (
                      <div className="flex items-center text-blue-600">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Lesson: {assignment.lesson.title}
                      </div>
                    )}
                    {assignment.due_date && (
                      <div className="flex items-center text-amber-600">
                        <Clock className="h-3 w-3 mr-1" />
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 line-clamp-3">
                  {assignment.description || "No description provided."}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/teacher/assignments/${assignment.id}`}>View Submissions</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200"
                  onClick={() => handleDeleteAssignment(assignment.id)}
                  disabled={isDeleting === assignment.id}
                >
                  {isDeleting === assignment.id ? "Deleting..." : "Delete"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
