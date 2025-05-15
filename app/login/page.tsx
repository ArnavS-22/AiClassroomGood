"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
})

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [loginStatus, setLoginStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [resendEmail, setResendEmail] = useState("")
  const { signIn, userRole } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  // Clear error message when form values change
  useEffect(() => {
    const subscription = form.watch(() => {
      if (errorMessage) {
        setErrorMessage(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, errorMessage])

  // Redirect if user role changes
  useEffect(() => {
    if (userRole) {
      console.log("Login page: User role detected, redirecting to dashboard:", userRole)
      if (userRole === "teacher") {
        router.push("/dashboard/teacher")
      } else if (userRole === "student") {
        router.push("/dashboard/student")
      }
    }
  }, [userRole, router])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      setLoginStatus("loading")
      setErrorMessage(null)

      console.time("login")
      const { error } = await signIn(values.email, values.password)
      console.timeEnd("login")

      if (error) {
        setLoginStatus("error")
        setErrorMessage(error)

        // If the error is about email confirmation, store the email for resending
        if (error.includes("confirm your email")) {
          setResendEmail(values.email)
        }

        toast({
          title: "Login Failed",
          description: error,
          variant: "destructive",
        })
        return
      }

      // Success case
      setLoginStatus("success")
      toast({
        title: "Login Successful",
        description: "You have successfully logged in.",
      })

      // Manual redirect will be handled by the useEffect above
    } catch (error) {
      console.error("Login error:", error)
      setLoginStatus("error")
      setErrorMessage("An unexpected error occurred. Please try again.")

      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResendConfirmationEmail() {
    try {
      setIsResendingEmail(true)

      // Get the redirect URL
      const redirectUrl = `${window.location.origin}/auth/callback`

      const { error } = await supabaseBrowser.auth.resend({
        type: "signup",
        email: resendEmail,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })

      if (error) throw error

      toast({
        title: "Confirmation email sent",
        description: "Please check your inbox for the confirmation link.",
      })

      setErrorMessage(null)
    } catch (error) {
      console.error("Error resending confirmation email:", error)
      toast({
        title: "Error",
        description: "Failed to resend confirmation email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResendingEmail(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          <span className="bg-gradient-to-r from-blue-500 to-violet-600 text-transparent bg-clip-text">
            Welcome Back
          </span>
        </h1>

        <div className="bg-white p-8 rounded-xl border border-blue-100 shadow-sm">
          {loginStatus === "success" && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">Login successful! Redirecting you...</AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>
                {errorMessage}
                {resendEmail && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendConfirmationEmail}
                      disabled={isResendingEmail}
                    >
                      {isResendingEmail ? "Sending..." : "Resend confirmation email"}
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
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
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log in"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
