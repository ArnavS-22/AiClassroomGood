"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [isValidToken, setIsValidToken] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsCheckingAuth(true)

        // Log URL parameters for debugging
        console.log("URL search params:", Object.fromEntries(searchParams.entries()))

        // Check if we have a session
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Error checking session:", error)
          setMessage({
            text: "Error checking authentication status. Please try again.",
            type: "error",
          })
          setIsValidToken(false)
          return
        }

        console.log("Session check result:", data.session ? "Session exists" : "No session")

        if (data.session) {
          setIsValidToken(true)
        } else {
          // Try to get the hash fragment from the URL
          const hash = window.location.hash
          console.log("URL hash:", hash)

          if (hash && hash.includes("type=recovery")) {
            // If we have a recovery hash but no session yet, the auth is still processing
            // We'll show a loading message and check again in a moment
            console.log("Recovery hash found, waiting for auth to process...")
            setTimeout(checkSession, 1000)
            return
          }

          setMessage({
            text: "Invalid or expired password reset link. Please request a new one.",
            type: "error",
          })
          setIsValidToken(false)
        }
      } catch (err) {
        console.error("Unexpected error during auth check:", err)
        setMessage({
          text: "An unexpected error occurred. Please try again.",
          type: "error",
        })
        setIsValidToken(false)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkSession()
  }, [supabase.auth, searchParams])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      setMessage({
        text: "Passwords do not match.",
        type: "error",
      })
      return
    }

    if (password.length < 8) {
      setMessage({
        text: "Password must be at least 8 characters long.",
        type: "error",
      })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      console.log("Updating password...")
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        throw error
      }

      setMessage({
        text: "Password updated successfully! You will be redirected to login.",
        type: "success",
      })

      // Clear form
      setPassword("")
      setConfirmPassword("")

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (error: any) {
      console.error("Error updating password:", error)
      setMessage({
        text: error.message || "An error occurred while updating your password. Please try again.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-4">
                <p>Verifying your reset link...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          <span className="bg-gradient-to-r from-blue-500 to-violet-600 text-transparent bg-clip-text">
            Update Password
          </span>
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>Set New Password</CardTitle>
            <CardDescription>Please enter your new password below.</CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <Alert
                className={`mb-6 ${
                  message.type === "success"
                    ? "border-green-200 text-green-800 bg-green-50"
                    : "border-red-200 text-red-800 bg-red-50"
                }`}
              >
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {isValidToken ? (
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    New Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4">
                <p className="text-red-600">Invalid or expired password reset link.</p>
                <Button className="mt-4" variant="outline" onClick={() => router.push("/reset-password")}>
                  Request New Reset Link
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <div className="text-sm text-gray-500">
              Remember your password?{" "}
              <a href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Back to Login
              </a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
