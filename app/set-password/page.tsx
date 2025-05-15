"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter, useSearchParams } from "next/navigation"

export default function SetPassword() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  // Get the token from the URL
  useEffect(() => {
    const handleHashParams = async () => {
      try {
        // Check if we have hash parameters (Supabase sends these for password reset)
        if (typeof window !== "undefined") {
          const hash = window.location.hash.substring(1)
          const params = new URLSearchParams(hash)

          // Log what we're receiving for debugging
          console.log("Hash parameters:", hash)

          // If we have a type=recovery in the hash, we need to process it
          if (params.get("type") === "recovery") {
            console.log("Processing recovery flow")

            // This will automatically process the recovery token
            const { error } = await supabase.auth.refreshSession()

            if (error) {
              console.error("Error processing recovery:", error)
              setMessage({
                type: "error",
                text: "Invalid or expired recovery link. Please request a new password reset.",
              })
            } else {
              console.log("Recovery processed successfully")
            }
          }
        }
      } catch (error) {
        console.error("Error processing hash parameters:", error)
      } finally {
        setIsProcessing(false)
      }
    }

    handleHashParams()
  }, [supabase.auth])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" })
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" })
      setIsLoading(false)
      return
    }

    try {
      console.log("Updating password")
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        console.error("Update password error:", error)
        setMessage({ type: "error", text: error.message })
      } else {
        console.log("Password updated successfully")
        setMessage({
          type: "success",
          text: "Password updated successfully! Redirecting to login...",
        })

        // Redirect after a short delay
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      }
    } catch (error) {
      console.error("Update password error:", error)
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isProcessing) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p>Processing your password reset request...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Input
                  id="password"
                  placeholder="New Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              <div className="grid gap-2">
                <Input
                  id="confirmPassword"
                  placeholder="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              {message && (
                <Alert className={message.type === "error" ? "bg-red-50" : "bg-green-50"}>
                  <AlertDescription className={message.type === "error" ? "text-red-600" : "text-green-600"}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Updating..." : "Set New Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
