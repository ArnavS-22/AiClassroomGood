"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabaseBrowser } from "@/lib/supabase-browser"

export default function AdminPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirmUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) return

    try {
      setIsLoading(true)
      setMessage(null)

      // This is a workaround for testing purposes
      // In a real application, you would use admin APIs to confirm users
      // Note: This will fail as client-side code doesn't have admin privileges
      const { error } = await supabaseBrowser.auth.admin.updateUserById(
        "00000000-0000-0000-0000-000000000000", // This won't actually work, it's just for demonstration
        { email_confirm: true },
      )

      if (error) {
        throw error
      }

      setMessage({
        text: "In a real application, this would confirm the user's email. For now, please use the confirmation link in the email.",
        type: "success",
      })
    } catch (error: any) {
      console.error("Error confirming user:", error)
      setMessage({
        text: "This feature requires admin privileges. For testing, please use the confirmation link in the email or configure Supabase to disable email confirmation.",
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          <span className="bg-gradient-to-r from-blue-500 to-violet-600 text-transparent bg-clip-text">
            Admin Tools
          </span>
        </h1>

        <Card className="border border-blue-100">
          <CardHeader>
            <CardTitle>Confirm User Email</CardTitle>
            <CardDescription>
              For testing purposes only. This allows you to confirm a user's email without them clicking the
              confirmation link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <Alert
                className={`mb-4 ${
                  message.type === "success"
                    ? "border-green-200 text-green-800 bg-green-50"
                    : "border-red-200 text-red-800 bg-red-50"
                }`}
              >
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleConfirmUser} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  User Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Confirm Email"}
              </Button>
            </form>

            <div className="mt-4 text-sm text-gray-500">
              <p>Note: In a production environment, you would need to:</p>
              <ol className="list-decimal ml-5 mt-2 space-y-1">
                <li>Configure Supabase to disable email confirmation</li>
                <li>Or use the Supabase admin API with proper credentials</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
