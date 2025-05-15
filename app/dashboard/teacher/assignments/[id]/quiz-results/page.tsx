"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { ArrowLeft, CheckCircle, XCircle, Users, BarChart, Loader2 } from "lucide-react"

interface QuizResult {
  id: string
  student_id: string
  student_name: string
  assignment_id: string
  score: number
  completed_at: string
  answers: {
    question_id: number
    question_text: string
    options: string[]
    selected_answer: number
    correct_answer: number
    is_correct: boolean
  }[]
}

export default function QuizResultsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [assignment, setAssignment] = useState<any>(null)
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    if (user && id) {
      fetchData()
    }
  }, [user, id])

  async function fetchData() {
    setIsLoading(true)
    try {
      // Fetch assignment data
      const assignmentResponse = await fetch(`/api/assignments/${id}?teacherId=${user?.id}`)

      if (!assignmentResponse.ok) {
        const errorData = await assignmentResponse.json()
        throw new Error(errorData.error || "Failed to fetch assignment data")
      }

      const assignmentData = await assignmentResponse.json()
      setAssignment(assignmentData)

      // Fetch quiz results
      const quizResultsResponse = await fetch(`/api/assignments/${id}/quiz-results?teacherId=${user?.id}`)

      if (!quizResultsResponse.ok) {
        const errorData = await quizResultsResponse.json()
        throw new Error(errorData.error || "Failed to fetch quiz results")
      }

      const quizResultsData = await quizResultsResponse.json()
      setQuizResults(quizResultsData)
    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Get all questions from the first quiz result (if available)
  const questions =
    quizResults.length > 0 && quizResults[0].answers
      ? quizResults[0].answers.map((answer) => ({
          id: answer.question_id,
          text: answer.question_text,
          options: answer.options,
          correctAnswer: answer.correct_answer,
        }))
      : []

  // Calculate analytics
  const averageScore =
    quizResults.length > 0
      ? Math.round(quizResults.reduce((sum, result) => sum + result.score, 0) / quizResults.length)
      : 0

  const questionAnalytics = questions.map((question, index) => {
    const correctCount = quizResults.reduce((count, result) => {
      return count + (result.answers && result.answers[index]?.is_correct ? 1 : 0)
    }, 0)

    const percentCorrect = quizResults.length > 0 ? Math.round((correctCount / quizResults.length) * 100) : 0

    return {
      ...question,
      percentCorrect,
      correctCount,
      totalAnswers: quizResults.length,
    }
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading quiz results...</p>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Assignment not found.</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/teacher")} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-violet-600 animate-gradient">
            Quiz Results: {assignment.title}
          </span>
        </h1>
      </div>

      {quizResults.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No students have taken this quiz yet.</p>
              <Button variant="outline" onClick={() => router.back()}>
                Return to Assignment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="overview">
              <BarChart className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="students">
              <Users className="h-4 w-4 mr-2" />
              Student Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Average Score</CardTitle>
                  <CardDescription>Across all students</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`text-4xl font-bold ${averageScore >= 70 ? "text-green-600" : "text-amber-600"}`}>
                    {averageScore}%
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Based on {quizResults.length} student{quizResults.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Completion Rate</CardTitle>
                  <CardDescription>Students who took the quiz</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600">{quizResults.length}</div>
                  <p className="text-sm text-gray-500 mt-2">
                    Out of {quizResults.length} student{quizResults.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Passing Rate</CardTitle>
                  <CardDescription>Students with 70% or higher</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600">
                    {quizResults.filter((result) => result.score >= 70).length}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Out of {quizResults.length} student{quizResults.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </div>

            {questions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Question Analysis</CardTitle>
                  <CardDescription>Performance breakdown by question</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {questionAnalytics.map((question, index) => (
                      <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">
                            {index + 1}. {question.text}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              question.percentCorrect >= 70
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {question.percentCorrect}% correct
                          </span>
                        </div>

                        <div className="ml-4 mt-3">
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Correct answer:</span>{" "}
                            {question.options[question.correctAnswer]}
                          </p>

                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${question.percentCorrect >= 70 ? "bg-green-500" : "bg-amber-500"}`}
                              style={{ width: `${question.percentCorrect}%` }}
                            ></div>
                          </div>

                          <p className="text-xs text-gray-500 mt-1">
                            {question.correctCount} out of {question.totalAnswers} students answered correctly
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Individual Student Results</CardTitle>
                <CardDescription>Detailed breakdown by student</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {quizResults.map((result) => (
                    <Card key={result.id} className="border border-gray-200">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle>{result.student_name}</CardTitle>
                          <span
                            className={`px-2.5 py-1 rounded text-sm font-medium ${
                              result.score >= 70 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            Score: {result.score}%
                          </span>
                        </div>
                        <CardDescription>Completed: {new Date(result.completed_at).toLocaleString()}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {result.answers && result.answers.length > 0 ? (
                          <div className="space-y-3">
                            {result.answers.map((answer, index) => (
                              <div key={index} className="flex items-start">
                                <div className="mr-2 mt-0.5">
                                  {answer.is_correct ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    Question {index + 1}: {answer.question_text}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Selected: {answer.options[answer.selected_answer]}
                                  </p>
                                  {!answer.is_correct && (
                                    <p className="text-xs text-green-600">
                                      Correct: {answer.options[answer.correct_answer]}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No detailed answer data available.</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
