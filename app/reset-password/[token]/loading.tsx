import { Card, CardContent } from "@/components/ui/card"

export default function ResetPasswordLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          <span className="bg-gradient-to-r from-blue-500 to-violet-600 text-transparent bg-clip-text">
            Reset Password
          </span>
        </h1>

        <Card>
          <CardContent className="p-8">
            <div className="flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
            </div>
            <p className="text-center mt-4">Loading...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
