"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { BookOpen, Calendar, FileText, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface StreamItem {
  id: string
  type: "assignment" | "lesson"
  created_at: string
  classroom: {
    id: string
    name: string
  }
  // Assignment specific
  title?: string
  description?: string
  due_date?: string | null
  // Lesson specific
  lesson?: {
    id: string
    title: string
    description: string
    file_url: string
  }
}

export function StudentStream() {
  const { user } = useAuth()
  const [streamItems, setStreamItems] = useState<StreamItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchStreamItems()
    }
  }, [user])

  async function fetchStreamItems() {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/student/stream?studentId=${user?.id}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch stream items")
      }

      const data = await response.json()
      setStreamItems(data || [])
    } catch (error: any) {
      console.error("Error fetching stream items:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load your stream. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border border-blue-100">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (streamItems.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 mb-4">You don't have any assignments or lessons yet.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/student?tab=classrooms">View Your Classrooms</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {streamItems.map((item) => (
        <Card key={`${item.type}-${item.id}`} className="border border-blue-100">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{item.type === "assignment" ? item.title : item.lesson?.title}</CardTitle>
                <CardDescription className="flex items-center mt-1">
                  <Users className="h-3 w-3 mr-1" />
                  {item.classroom.name}
                </CardDescription>
              </div>
              <Badge className={item.type === "assignment" ? "bg-amber-500" : "bg-blue-500"}>
                {item.type === "assignment" ? "Assignment" : "Lesson"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-3">
              {item.type === "assignment" ? item.description : item.lesson?.description || "No description provided."}
            </p>
            <div className="flex flex-col gap-1 text-xs text-gray-400">
              <div>Posted: {formatDate(item.created_at)}</div>
              {item.type === "assignment" && item.due_date && (
                <div className="flex items-center text-amber-600">
                  <Calendar className="h-3 w-3 mr-1" />
                  Due: {formatDate(item.due_date)}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            {item.type === "assignment" ? (
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                asChild
              >
                <Link href={`/dashboard/student/assignments/${item.id}`}>
                  <FileText className="h-4 w-4 mr-1" />
                  View Assignment
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
                asChild
              >
                <Link href={`/chat/${item.lesson?.id}`}>
                  <BookOpen className="h-4 w-4 mr-1" />
                  Study with AI
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
