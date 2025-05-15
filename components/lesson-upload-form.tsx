"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import type { Classroom } from "@/lib/types"
import { Loader2, AlertTriangle } from "lucide-react"

// Define the form schema with validation
const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  subject: z.enum(["Math", "Science", "English", "History", "Other"], {
    required_error: "Please select a subject.",
  }),
  gradeLevel: z.enum(["K-5", "6-8", "9-12"], {
    required_error: "Please select a grade level.",
  }),
  file: z
    .instanceof(File, {
      message: "Please upload a file.",
    })
    .refine((file) => file.type === "application/pdf", {
      message: "File must be a PDF.",
    })
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: "File must be less than 10MB.",
    }),
  assignToClassroom: z.boolean().default(false),
  classroomId: z.string().optional(),
  generateAI: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

interface LessonUploadFormProps {
  onSuccess?: () => void
}

export function LessonUploadForm({ onSuccess }: LessonUploadFormProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(false)
  const [classroomFetchError, setClassroomFetchError] = useState<string | null>(null)
  const [apiKeyStatus, setApiKeyStatus] = useState<"valid" | "invalid" | "unknown">("unknown")
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      subject: undefined,
      gradeLevel: undefined,
      assignToClassroom: false,
      classroomId: undefined,
      generateAI: true,
    },
  })

  const assignToClassroom = form.watch("assignToClassroom")
  const generateAI = form.watch("generateAI")

  // Check API key status on component mount
  useEffect(() => {
    checkApiKeyStatus()
  }, [])

  // Function to check API key status
  async function checkApiKeyStatus() {
    try {
      setIsCheckingApiKey(true)
      const response = await fetch("/api/openai/check-key")

      if (!response.ok) {
        setApiKeyStatus("invalid")
        return
      }

      const data = await response.json()
      setApiKeyStatus(data.isValid ? "valid" : "invalid")
    } catch (error) {
      console.error("Error checking API key status:", error)
      setApiKeyStatus("invalid")
    } finally {
      setIsCheckingApiKey(false)
    }
  }

  // Fetch teacher's classrooms
  useEffect(() => {
    if (user) {
      fetchClassrooms()
    }
  }, [user])

  // Add a retry mechanism for fetching classrooms
  async function fetchClassrooms(retryCount = 0) {
    if (!user) return

    try {
      setIsLoadingClassrooms(true)
      setClassroomFetchError(null)
      console.log("Fetching classrooms for teacher:", user.id)

      // Use a direct API call with a timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      // Use a timestamp to prevent caching
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/teacher/get-classrooms?teacherId=${user.id}&t=${timestamp}`, {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      clearTimeout(timeoutId)

      // Check if response is OK
      if (!response.ok) {
        // Try to parse error as JSON
        let errorMessage = "Failed to fetch classrooms"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If parsing fails, use text content or status
          try {
            const textContent = await response.text()
            errorMessage = `Server error: ${response.status} - ${textContent.substring(0, 100)}...`
          } catch (textError) {
            errorMessage = `HTTP error: ${response.status}`
          }
        }
        throw new Error(errorMessage)
      }

      // Check content type to ensure it's JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Expected JSON response but got ${contentType || "unknown content type"}`)
      }

      // Parse JSON response
      const data = await response.json()
      console.log("Fetched classrooms:", data)

      // Validate data is an array
      if (!Array.isArray(data)) {
        throw new Error(`Expected array of classrooms but got ${typeof data}`)
      }

      setClassrooms(data || [])
    } catch (error: any) {
      console.error("Error fetching classrooms:", error)

      // Retry logic for network errors or timeouts
      if (
        (error.name === "AbortError" || error.name === "TypeError" || error.message.includes("network")) &&
        retryCount < 3
      ) {
        console.log(`Retrying classroom fetch (attempt ${retryCount + 1})...`)
        setTimeout(() => fetchClassrooms(retryCount + 1), 1000 * (retryCount + 1))
        return
      }

      setClassroomFetchError(error.message || "Failed to load your classrooms. Please try again.")

      // Set empty classrooms array to prevent infinite loading state
      setClassrooms([])
    } finally {
      setIsLoadingClassrooms(false)
    }
  }

  // Force refresh classrooms when the checkbox is checked
  useEffect(() => {
    if (assignToClassroom && user) {
      fetchClassrooms()
    }
  }, [assignToClassroom, user])

  async function onSubmit(values: FormValues) {
    if (!user) {
      setError("You must be logged in to upload lessons.")
      return
    }

    try {
      setIsUploading(true)
      setError(null)

      // Create a FormData object to send the file and other data
      const formData = new FormData()
      formData.append("file", values.file)
      formData.append("title", values.title)
      formData.append("description", values.description)
      formData.append("subject", values.subject)
      formData.append("gradeLevel", values.gradeLevel)
      formData.append("teacherId", user.id)
      formData.append("assignToClassroom", values.assignToClassroom.toString())
      formData.append("generateAI", values.generateAI.toString())

      if (values.assignToClassroom && values.classroomId) {
        formData.append("classroomId", values.classroomId)
      }

      // Upload the lesson using our API route
      const response = await fetch("/api/lessons/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = "Failed to upload lesson"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If parsing fails, use text content or status
          try {
            const textContent = await response.text()
            errorMessage = `Server error: ${response.status} - ${textContent.substring(0, 100)}...`
          } catch (textError) {
            errorMessage = `HTTP error: ${response.status}`
          }
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      // If AI generation is enabled, trigger it
      if (data.lesson && values.generateAI) {
        try {
          // Trigger AI content generation
          const aiResponse = await fetch("/api/lessons/generate-ai", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              lessonId: data.lesson.id,
              teacherId: user.id,
            }),
          })

          const aiData = await aiResponse.json()

          if (!aiResponse.ok) {
            console.error("Error triggering generation:", aiData.error)
            toast({
              title: "Generation Warning",
              description: "Lesson uploaded but content generation failed to start. You can try again later.",
              variant: "destructive",
            })
          } else if (aiData.processing) {
            if (aiData.usingFallback) {
              toast({
                title: "Fallback Content Generation",
                description: "Your lesson has been uploaded. Using fallback content generation due to invalid API key.",
              })
            } else {
              toast({
                title: "AI Generation Started",
                description:
                  "Your lesson has been uploaded and AI content generation has started. This may take a few minutes.",
              })
            }
          } else if (aiData.alreadyExists) {
            toast({
              title: "Content Already Exists",
              description: `Your lesson has been uploaded. ${
                aiData.isFallback ? "Fallback" : "AI"
              } content was already generated for this lesson.`,
            })
          }
        } catch (error) {
          console.error("Error triggering generation:", error)
          toast({
            title: "Generation Warning",
            description: "Lesson uploaded but content generation failed to start. You can try again later.",
          })
        }
      }

      // Show success message and reset form
      toast({
        title: "Lesson uploaded!",
        description: values.assignToClassroom
          ? "Your lesson has been uploaded and assigned to the selected classroom."
          : "Your lesson has been successfully uploaded.",
      })

      form.reset()

      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error uploading lesson:", error)
      setError(error.message || "There was a problem uploading your lesson. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {generateAI && apiKeyStatus === "invalid" && (
        <Alert variant="warning" className="mb-6 border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">OpenAI API Key Issue</AlertTitle>
          <AlertDescription className="text-amber-700">
            Your OpenAI API key appears to be invalid or in the wrong format. The system will use fallback content
            generation instead of AI. To fix this, add a valid OpenAI API key (starting with "sk-") to your environment
            variables.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lesson Title</FormLabel>
                <FormControl>
                  <Input placeholder="Introduction to Photosynthesis" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lesson Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="A comprehensive introduction to how plants convert light energy into chemical energy..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Math">Math</SelectItem>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="History">History</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gradeLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade Level</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="K-5">K–5</SelectItem>
                        <SelectItem value="6-8">6–8</SelectItem>
                        <SelectItem value="9-12">9–12</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="file"
            render={({ field: { value, onChange, ...fieldProps } }) => (
              <FormItem>
                <FormLabel>Upload PDF</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        onChange(file)
                      }
                    }}
                    {...fieldProps}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="generateAI"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Generate Content</FormLabel>
                  <p className="text-sm text-gray-500">
                    {apiKeyStatus === "valid"
                      ? "Use AI to analyze the PDF and generate interactive lesson content and quiz questions"
                      : "Generate basic lesson content and quiz questions (AI unavailable)"}
                  </p>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assignToClassroom"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Assign to Classroom</FormLabel>
                  <p className="text-sm text-gray-500">
                    Make this lesson immediately available to students in a classroom
                  </p>
                </div>
              </FormItem>
            )}
          />

          {assignToClassroom && (
            <FormField
              control={form.control}
              name="classroomId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center mb-2">
                    <FormLabel>Select Classroom</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fetchClassrooms()}
                      disabled={isLoadingClassrooms}
                    >
                      {isLoadingClassrooms ? "Refreshing..." : "Refresh List"}
                    </Button>
                  </div>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={isLoadingClassrooms ? "Loading classrooms..." : "Select a classroom"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingClassrooms ? (
                          <SelectItem value="loading" disabled>
                            Loading classrooms...
                          </SelectItem>
                        ) : classrooms.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No classrooms available
                          </SelectItem>
                        ) : (
                          classrooms.map((classroom) => (
                            <SelectItem key={classroom.id} value={classroom.id}>
                              {classroom.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  {classroomFetchError && <p className="text-sm text-red-500 mt-1">{classroomFetchError}</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Lesson"
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
