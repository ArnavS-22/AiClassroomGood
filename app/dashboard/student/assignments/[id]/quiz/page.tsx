"use client"

import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function AssignmentQuizPage() {
  const { id } = useParams()
  const router = useRouter()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-violet-600 animate-gradient">
            Quiz
          </span>
        </h1>
      </div>

      <div className="max-w-3xl mx-auto">
        <Card className="border border-blue-100 mb-8">
          <CardHeader>
            <CardTitle>Quiz Feature Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center">
              <h3 className="text-xl font-medium text-blue-800 mb-4">AI-Generated Quizzes</h3>
              <p className="text-blue-700 mb-6">
                The quiz feature is coming soon. Check back later to test your knowledge.
              </p>
              <Button variant="outline" onClick={() => router.back()}>
                Return to Previous Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
