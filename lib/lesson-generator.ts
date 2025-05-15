export function generateLessonFromPDF(pdfUrl: string, title: string) {
  // This is a placeholder function that would normally analyze a PDF
  // and generate a lesson based on its content

  // For now, we'll return hardcoded content
  return {
    lessonContent: {
      title: title || "APUSH DBQ Writing Guide",
      pages: [
        {
          title: "Understanding DBQ Format",
          sections: [
            {
              title: "Introduction to DBQs",
              content:
                "Document-Based Questions (DBQs) are a key component of AP US History exams. They test your ability to analyze historical documents and use them as evidence to support an argument.",
              activities: [
                {
                  type: "prompt-analysis",
                  instructions: "Analyze the following DBQ prompt:",
                  fields: [
                    { name: "mainIdea", label: "Main Idea" },
                    { name: "timeframe", label: "Time Period" },
                    { name: "keyTerms", label: "Key Terms to Address" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    quiz: {
      title: "DBQ Writing Quiz",
      description: "Test your understanding of DBQ writing techniques",
      questions: [
        {
          question: "What does the acronym HAPP stand for in document analysis?",
          options: [
            "Historical context, Audience, Purpose, Point of view",
            "History, Analysis, Perspective, Proof",
            "Helpful Analysis, Purpose, Perspective",
            "Historical Analysis, Primary source, Perspective",
          ],
          correctAnswer: 0,
        },
        {
          question: "How many points is the AP US History DBQ worth?",
          options: ["5 points", "7 points", "10 points", "15 points"],
          correctAnswer: 1,
        },
      ],
    },
  }
}
