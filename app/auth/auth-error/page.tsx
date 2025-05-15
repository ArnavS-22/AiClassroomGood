import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-3xl font-bold mb-6">
          <span className="bg-gradient-to-r from-blue-500 to-violet-600 text-transparent bg-clip-text">
            Authentication Error
          </span>
        </h1>

        <div className="bg-white p-8 rounded-xl border border-blue-100 shadow-sm">
          <p className="mb-6">
            There was a problem with the authentication process. This could be due to an expired or invalid link.
          </p>

          <div className="flex flex-col gap-4">
            <Link href="/login">
              <Button className="w-full">Return to Login</Button>
            </Link>

            <Link href="/">
              <Button variant="outline" className="w-full">
                Go to Homepage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
