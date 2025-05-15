"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { Classroom } from "@/lib/types"
import { PlusCircle, Users, BookOpen, Copy, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ClassroomsListProps {
  classrooms: Classroom[]
  isLoading: boolean
  onCreateClassroom: () => void
  onRefresh: () => void
}

export function ClassroomsList({ classrooms, isLoading, onCreateClassroom, onRefresh }: ClassroomsListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  async function handleDeleteClassroom(classroom: Classroom) {
    if (!user) return

    try {
      setIsDeleting(classroom.id)
      console.log(`Deleting classroom ${classroom.id} for teacher ${user.id}`)

      // Use the API route instead of direct Supabase query
      const response = await fetch("/api/classrooms/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ classroomId: classroom.id, teacherId: user.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete classroom")
      }

      toast({
        title: "Classroom deleted",
        description: "The classroom has been successfully deleted.",
      })

      // Refresh the classrooms list
      onRefresh()
    } catch (error) {
      console.error("Error deleting classroom:", error)
      toast({
        title: "Error",
        description: "Failed to delete the classroom. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
      setClassroomToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  const copyJoinCode = (joinCode: string) => {
    navigator.clipboard.writeText(joinCode)
    setCopiedCode(joinCode)
    setTimeout(() => setCopiedCode(null), 2000)

    toast({
      title: "Join code copied!",
      description: "The join code has been copied to your clipboard.",
    })
  }

  const openDeleteDialog = (classroom: Classroom) => {
    setClassroomToDelete(classroom)
    setDeleteDialogOpen(true)
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading your classrooms...</div>
  }

  if (classrooms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">You haven't created any classrooms yet.</p>
        <Button variant="outline" onClick={onCreateClassroom}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Your First Classroom
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classrooms.map((classroom) => (
          <Card key={classroom.id} className="border border-blue-100 flex flex-col">
            <CardHeader>
              <CardTitle className="line-clamp-1">{classroom.name}</CardTitle>
              <CardDescription>
                <div className="flex items-center mt-1">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{classroom.student_count || 0} students</span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              {classroom.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{classroom.description}</p>
              )}

              {classroom.join_code && (
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                  <p className="text-sm font-medium mb-1">Join Code:</p>
                  <div className="flex items-center">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono flex-1 overflow-x-auto">
                      {classroom.join_code}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-8 w-8 p-0"
                      onClick={() => copyJoinCode(classroom.join_code)}
                    >
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Copy join code</span>
                    </Button>
                  </div>
                  {copiedCode === classroom.join_code && (
                    <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <div className="flex w-full justify-between">
                <Button variant="outline" size="sm" asChild className="flex-1 mr-2">
                  <Link href={`/dashboard/teacher/classrooms/${classroom.id}`}>Manage Classroom</Link>
                </Button>
                <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 flex-1" asChild>
                  <Link href={`/dashboard/teacher/classrooms/${classroom.id}/assignments`}>
                    <BookOpen className="h-4 w-4 mr-1" />
                    Assignments
                  </Link>
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 w-full"
                onClick={() => openDeleteDialog(classroom)}
                disabled={isDeleting === classroom.id}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {isDeleting === classroom.id ? "Deleting..." : "Delete Classroom"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Classroom</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the classroom "{classroomToDelete?.name}"? This action cannot be undone.
              All assignments and student enrollments for this classroom will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => classroomToDelete && handleDeleteClassroom(classroomToDelete)}
              disabled={isDeleting === classroomToDelete?.id}
            >
              {isDeleting === classroomToDelete?.id ? "Deleting..." : "Delete Classroom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
