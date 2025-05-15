import { Skeleton } from "@/components/ui/skeleton"

export default function UpdatePasswordLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto">
        <div className="h-10 mb-6">
          <Skeleton className="h-full w-3/4 mx-auto" />
        </div>

        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <div className="space-y-6">
            <div>
              <Skeleton className="h-6 w-1/2 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <div className="space-y-4">
              <div>
                <Skeleton className="h-5 w-1/4 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>

              <div>
                <Skeleton className="h-5 w-1/3 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>

              <Skeleton className="h-10 w-full" />
            </div>

            <div className="flex justify-center">
              <Skeleton className="h-5 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
