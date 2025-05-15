import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export default async function Home() {
  // Get the session server-side to determine if user is logged in
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.delete({ name, ...options })
        },
      },
    },
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const isLoggedIn = !!session

  return (
    <div className="min-h-[calc(100vh-73px)] flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-violet-600 animate-gradient">
              Transform Your Curriculum
            </span>
            <br />
            Into Personalized Learning
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Upload your curriculum once, and let AI create structured, personalized lessons for your students.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard/teacher">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white"
                  >
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/dashboard/teacher?tab=create-classroom">
                  <Button size="lg" variant="outline" className="border-blue-200 hover:border-blue-300">
                    Create a Classroom
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup?role=teacher">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white"
                  >
                    Sign up as Teacher
                  </Button>
                </Link>
                <Link href="/signup?role=student">
                  <Button size="lg" variant="outline" className="border-blue-200 hover:border-blue-300">
                    Sign up as Student
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-3xl font-bold text-center mb-12">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-violet-600">
              Benefits for Everyone
            </span>
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-xl border border-blue-100 shadow-sm">
              <h3 className="font-serif text-xl font-semibold mb-4">For Teachers</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>Save hours of lesson preparation time</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>Upload once, use repeatedly</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>Track student engagement with your materials</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>AI-powered insights on curriculum effectiveness</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-xl border border-violet-100 shadow-sm">
              <h3 className="font-serif text-xl font-semibold mb-4">For Students</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-violet-500 mr-2">✓</span>
                  <span>Get personalized help with lesson content</span>
                </li>
                <li className="flex items-start">
                  <span className="text-violet-500 mr-2">✓</span>
                  <span>Ask questions about the material anytime</span>
                </li>
                <li className="flex items-start">
                  <span className="text-violet-500 mr-2">✓</span>
                  <span>Learn at your own pace</span>
                </li>
                <li className="flex items-start">
                  <span className="text-violet-500 mr-2">✓</span>
                  <span>Get immediate feedback on your understanding</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
