"use client"

import { useState } from "react"
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
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import type { Assignment, Classroom, Lesson } from "@/lib/types"
import { PlusCircle, Calendar, Trash2, AlertCircle, BookOpen } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"

interface AssignmentsListProps {
  assignments: Assignment[]
  lessons: Lesson[]
  classrooms: Classroom[]
  isLoading: boolean
  onRefresh: () => void
}

// Define the form schema with validation
const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string().optional(),
  classroom_id: z.string({
    required_error: "Please select a classroom.",
  }),
  attach_lesson: z.boolean().default(false),
  lesson_id: z.string().optional(),
  due_date: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function AssignmentsList({ assignments, lessons, classrooms, isLoading, onRefresh }: AssignmentsListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const supabase = getSupabaseBrowserClient()
  const { user } = useAuth()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      classroom_id: "",
      attach_lesson: false,
      lesson_id: "",
      due_date: "",
    },
  })

  // Watch the attach_lesson field to conditionally show/hide the lesson selection
  const attachLesson = form.watch("attach_lesson")

  // Function to open the delete confirmation dialog
  const openDeleteConfirmation = (assignmentId: string) => {
    setConfirmDeleteId(assignmentId)
    setIsConfirmDialogOpen(true)
    setDeleteError(null)
  }

  async function handleDeleteAssignment(assignmentId: string) {
    try {
      setIsDeleting(assignmentId)
      setDeleteError(null)

      console.log(`Deleting assignment ${assignmentId}`)

      // Use API route to delete assignment
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

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to delete assignment")
      }

      console.log("Delete response:", responseData)

      toast({
        title: "Assignment deleted",
        description: "The assignment has been successfully deleted.",
      })

      // Close the confirmation dialog
      setIsConfirmDialogOpen(false)
      setConfirmDeleteId(null)

      // Refresh the assignments list
      onRefresh()
    } catch (error: any) {
      console.error("Error deleting assignment:", error)
      setDeleteError(error.message || "Failed to delete the assignment. Please try again.")
      toast({
        title: "Error",
        description: error.message || "Failed to delete the assignment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  async function onSubmit(values: FormValues) {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an assignment.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreating(true)

      // Use API route to create assignment
      const response = await fetch("/api/assignments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: values.title,
          description: values.description || null,
          classroomId: values.classroom_id,
          lessonId: values.attach_lesson ? values.lesson_id : null, // Only include lesson_id if attach_lesson is true
          teacherId: user.id,
          dueDate: values.due_date || null,
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
      onRefresh()
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

  if (isLoading) {
    return <div className="text-center py-12">Loading your assignments...</div>
  }

  const noClassrooms = classrooms.length === 0

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Assignments</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={noClassrooms}
              className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
              <DialogDescription>Create an assignment for your students.</DialogDescription>
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
                  name="classroom_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classroom</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select classroom" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classrooms.map((classroom) => (
                            <SelectItem key={classroom.id} value={classroom.id}>
                              {classroom.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

      {noClassrooms ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">You need to create classrooms before you can create assignments.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" asChild>
              <Link href="/dashboard/teacher?tab=create-classroom">Create Classroom</Link>
            </Button>
          </div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">You haven't created any assignments yet.</p>
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
                    <div>Classroom: {assignment.classroom?.name}</div>
                    {assignment.lesson && (
                      <div className="flex items-center text-blue-600">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Lesson: {assignment.lesson.title}
                      </div>
                    )}
                    {assignment.due_date && (
                      <div className="flex items-center text-amber-600">
                        <Calendar className="h-3 w-3 mr-1" />
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
                  onClick={() => openDeleteConfirmation(assignment.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this assignment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDeleteId && handleDeleteAssignment(confirmDeleteId)}
              disabled={isDeleting !== null}
            >
              {isDeleting ? "Deleting..." : "Delete Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
