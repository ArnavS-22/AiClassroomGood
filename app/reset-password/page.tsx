"use client"

import { useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseBrowserClient } from "@/lib/supabase"

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
})

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const supabase = getSupabaseBrowserClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      setMessage(null)

      // Get the base URL for redirects
      const baseUrl = window.location.origin
      const redirectTo = `${baseUrl}/update-password`

      console.log("Sending reset password email with redirect to:", redirectTo)

      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: redirectTo,
      })

      if (error) throw error

      setMessage({
        text: "Password reset link sent! Please check your email.",
        type: "success",
      })
      form.reset()
    } catch (error: any) {
      console.error("Error sending reset password email:", error)
      setMessage({
        text: error.message || "An error occurred. Please try again.",
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
            Reset Password
          </span>
        </h1>

        <div className="bg-white p-8 rounded-xl border border-blue-100 shadow-sm">
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

          <p className="mb-6 text-gray-600">
            Enter your email address below, and we'll send you a link to reset your password.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your.email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <a href="/login" className="text-blue-600 hover:text-blue-800 text-sm">
              Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
