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
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchStreamItems()
    }
  }, [user])

  async function fetchStreamItems() {
    setIsLoading(true)
    setError(null)

    try {
      console.log("Fetching stream items for user:", user?.id)

      if (!user?.id) {
        console.error("User ID is missing")
        setStreamItems([])
        setError("User ID is missing. Please try logging in again.")
        return
      }

      const response = await fetch(`/api/student/stream?studentId=${user.id}`)
      console.log("Stream API response status:", response.status)

      // Get the response text first
      const responseText = await response.text()
      console.log("Stream API response text length:", responseText.length)

      if (responseText.length === 0) {
        console.log("Empty response from stream API")
        setStreamItems([])
        return
      }

      // Try to parse it as JSON
      let data
      try {
        data = JSON.parse(responseText)
        console.log("Stream API data parsed successfully")
      } catch (e) {
        console.error("Error parsing response as JSON:", e)
        console.error("Response text:", responseText.substring(0, 200) + "...")
        setStreamItems([])
        setError("Invalid response format from server")
        return
      }

      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.warn("Stream API did not return an array:", typeof data)
        // If data is not an array but has a property that might be our array, try to use that
        if (data && typeof data === "object") {
          // Check for common array properties
          if (Array.isArray(data.streamItems)) {
            data = data.streamItems
          } else if (Array.isArray(data.items)) {
            data = data.items
          } else if (Array.isArray(data.data)) {
            data = data.data
          } else {
            // If we can't find an array, use an empty array
            console.error("Could not find array in response:", data)
            data = []
          }
        } else {
          // If data is not an object or array, use an empty array
          data = []
        }
      }

      console.log(`Setting ${data.length} stream items`)
      setStreamItems(data || [])
    } catch (error: any) {
      console.error("Error fetching stream items:", error)
      setError(error.message || "Failed to load your stream. Please try again.")
      // Set streamItems to empty array on error
      setStreamItems([])
    } finally {
      setIsLoading(false)
    }
  }

  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (e) {
      console.error("Error formatting date:", e)
      return "Invalid date"
    }
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

  if (error) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-red-500 mb-4">{error}</p>
        <Button variant="outline" onClick={fetchStreamItems}>
          Try Again
        </Button>
      </div>
    )
  }

  if (!Array.isArray(streamItems) || streamItems.length === 0) {
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
      {streamItems
        .map((item, index) => {
          // Skip items without required data
          if (!item || !item.id || !item.type) {
            console.warn("Invalid stream item at index", index, item)
            return null
          }

          // For lesson items, check if lesson data exists
          if (item.type === "lesson" && (!item.lesson || !item.lesson.id)) {
            console.warn("Invalid lesson item at index", index, item)
            return null
          }

          return (
            <Card key={`${item.type}-${item.id}-${index}`} className="border border-blue-100">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{item.type === "assignment" ? item.title : item.lesson?.title}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <Users className="h-3 w-3 mr-1" />
                      {item.classroom?.name || "Unknown Classroom"}
                    </CardDescription>
                  </div>
                  <Badge className={item.type === "assignment" ? "bg-amber-500" : "bg-blue-500"}>
                    {item.type === "assignment" ? "Assignment" : "Lesson"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3">
                  {item.type === "assignment"
                    ? item.description
                    : item.lesson?.description || "No description provided."}
                </p>
                <div className="flex flex-col gap-1 text-xs text-gray-400">
                  {item.created_at && <div>Posted: {formatDate(item.created_at)}</div>}
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
          )
        })
        .filter(Boolean)}
    </div>
  )
}
