import type { Metadata } from "next"
import { StudentStream } from "@/components/student-stream"

export const metadata: Metadata = {
  title: "Stream | Curriculum AI",
  description: "View your assignments and lessons in a chronological feed",
}

export default function StreamPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Learning Stream</h1>
      <StudentStream />
    </div>
  )
}
