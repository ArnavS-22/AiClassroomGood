"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { Lesson, Message } from "@/lib/types"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ChatPage() {
  const { lessonId } = useParams()
  const { user } = useAuth()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [inFallbackMode, setInFallbackMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    async function fetchLessonAndMessages() {
      if (!user || !lessonId) return

      try {
        // Fetch lesson details
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select("*")
          .eq("id", lessonId)
          .single()

        if (lessonError) throw lessonError

        setLesson(lessonData)

        // Fetch messages for this lesson
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("lesson_id", lessonId)
          .eq("user_id", user.id)
          .order("timestamp", { ascending: true })

        if (messagesError) throw messagesError

        setMessages(messagesData || [])
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLessonAndMessages()

    // Set up real-time subscription for new messages
    const messagesSubscription = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `lesson_id=eq.${lessonId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          // Only add messages for the current user
          if (newMessage.user_id === user?.id) {
            setMessages((prevMessages) => [...prevMessages, newMessage])
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesSubscription)
    }
  }, [user, lessonId, supabase])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()

    if (!user || !lessonId || !newMessage.trim()) return

    try {
      setIsSending(true)

      // Insert student message locally first for immediate feedback
      const tempStudentMsg: Message = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        lesson_id: lessonId as string,
        role: "student",
        message_text: newMessage,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, tempStudentMsg])

      // Clear input
      setNewMessage("")

      // Call the chat API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: newMessage,
          lessonId,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      // Check if we're in fallback mode
      if (data.fallbackMode) {
        setInFallbackMode(true)
      }

      // The messages will be added via the real-time subscription,
      // but we can add a temporary AI message for immediate feedback
      // if the subscription is slow
      const tempAiMsg: Message = {
        id: `temp-ai-${Date.now()}`,
        user_id: user.id,
        lesson_id: lessonId as string,
        role: "ai",
        message_text: data.message,
        timestamp: new Date().toISOString(),
      }

      // Check if the message was already added by the subscription
      const messageExists = messages.some((m) => m.role === "ai" && m.message_text === data.message)

      if (!messageExists) {
        setMessages((prev) => [...prev, tempAiMsg])
      }
    } catch (error) {
      console.error("Error sending message:", error)
      // Show error message to user
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        user_id: user.id,
        lesson_id: lessonId as string,
        role: "ai",
        message_text: "Sorry, there was an error processing your message. Please try again.",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-2">Loading chat...</p>
      </div>
    )
  }

  if (!lesson) {
    return <div className="container mx-auto px-4 py-8 text-center">Lesson not found.</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card className="border border-blue-100 sticky top-8">
            <CardHeader>
              <CardTitle className="text-lg">Lesson Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">{lesson.title}</h3>
                <p className="text-sm text-gray-500">
                  Grade: {lesson.grade_level} | Subject: {lesson.subject}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 line-clamp-4">{lesson.description}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href={lesson.file_url} target="_blank" rel="noopener noreferrer">
                  View Lesson Material
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card className="border border-blue-100">
            <CardHeader>
              <CardTitle>Chat with AI Tutor</CardTitle>
              <CardDescription>Ask questions about this lesson and get immediate help.</CardDescription>

              {inFallbackMode && (
                <Alert className="mt-2 bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    The AI tutor is currently in fallback mode due to API limitations. Responses are pre-generated and
                    may not directly address specific questions.
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col h-[60vh]">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>No messages yet. Start by asking a question about the lesson.</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "student" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            message.role === "student"
                              ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <p className="whitespace-pre-line">{message.message_text}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Ask a question about this lesson..."
                      disabled={isSending}
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || isSending}
                      className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
