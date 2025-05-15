"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import type { Classroom } from "@/lib/types"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Classroom name must be at least 2 characters.",
  }),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateClassroomFormProps {
  onSuccess: (classroom: Classroom) => void
}

export function CreateClassroomForm({ onSuccess }: CreateClassroomFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  async function onSubmit(values: FormValues) {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a classroom.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/classrooms/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          teacherId: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create classroom")
      }

      const data = await response.json()

      toast({
        title: "Classroom created",
        description: "Your classroom has been created successfully.",
      })

      // Reset the form
      form.reset()

      // Call the onSuccess callback with the new classroom
      onSuccess(data)
    } catch (error: any) {
      console.error("Error creating classroom:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create classroom. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Classroom Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Math 101" {...field} />
              </FormControl>
              <FormDescription>This is the name students will see when joining your classroom.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe your classroom..." {...field} />
              </FormControl>
              <FormDescription>Provide additional details about your classroom.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Classroom"}
        </Button>
      </form>
    </Form>
  )
}
