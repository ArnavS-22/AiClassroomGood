"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface JoinClassroomFormProps {
  onSuccess: () => void
}

export function JoinClassroomForm({ onSuccess }: JoinClassroomFormProps) {
  const [joinCode, setJoinCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

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

    setIsSubmitting(true)

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

      setJoinCode("")
      onSuccess()
    } catch (error: any) {
      console.error("Error joining classroom:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to join the classroom. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join a Classroom</CardTitle>
        <CardDescription>Enter the join code provided by your teacher to join a classroom.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-code">Join Code</Label>
            <Input
              id="join-code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              maxLength={10}
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Joining..." : "Join Classroom"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
