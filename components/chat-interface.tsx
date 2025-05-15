"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface Message {
  id?: string
  role: "student" | "ai"
  content: string
  timestamp?: string
}

interface ChatInterfaceProps {
  lessonId: string
  userId: string
}

export function ChatInterface({ lessonId, userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingHistory, setIsFetchingHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  // Fetch chat history when component mounts
  useEffect(() => {
    fetchChatHistory()
  }, [lessonId, userId])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function fetchChatHistory() {
    if (!lessonId || !userId) return

    try {
      setIsFetchingHistory(true)

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("lesson_id", lessonId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        const formattedMessages = data.map((msg) => ({
          id: msg.id,
          role: msg.role as "student" | "ai",
          content: msg.message_text,
          timestamp: msg.created_at,
        }))

        setMessages(formattedMessages)
      } else if (data && data.length === 0) {
        // Add welcome message if no history
        setMessages([
          {
            role: "ai",
            content: "Hello! I'm your AI learning assistant. How can I help you with this lesson?",
          },
        ])
      }
    } catch (error) {
      console.error("Error fetching chat history:", error)
      toast({
        title: "Error",
        description: "Failed to load chat history. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsFetchingHistory(false)
    }
  }

  async function handleSendMessage() {
    if (!input.trim() || !lessonId || !userId) return

    const userMessage: Message = {
      role: "student",
      content: input.trim(),
    }

    try {
      setIsLoading(true)
      setMessages((prev) => [...prev, userMessage])
      setInput("")

      // Save user message to database
      const { data: savedMessage, error: saveError } = await supabase
        .from("messages")
        .insert([
          {
            user_id: userId,
            lesson_id: lessonId,
            role: "student",
            message_text: userMessage.content,
          },
        ])
        .select()
        .single()

      if (saveError) throw saveError

      // Get AI response
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          lessonId,
          userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to get AI response")
      }

      const data = await response.json()

      // Add AI response to messages
      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          role: "ai",
          content: data.content,
          timestamp: data.timestamp,
        },
      ])
    } catch (error: any) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      })

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "I'm sorry, I encountered an error. Please try again later.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <Card className="border border-blue-100">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-violet-500" />
          Ask AI About This Lesson
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] overflow-y-auto mb-4 p-4 border rounded-md bg-gray-50">
          {isFetchingHistory ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div key={index} className={`mb-4 ${message.role === "ai" ? "text-left" : "text-right"}`}>
                  <div
                    className={`inline-block max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "ai" ? "bg-white border border-gray-200" : "bg-blue-500 text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-center space-x-2">
          <Textarea
            placeholder="Ask a question about this lesson..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            className="min-h-[60px]"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
