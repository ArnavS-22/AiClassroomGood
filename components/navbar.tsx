"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, BookOpen, Users, FileText, Home, LogOut, Activity } from "lucide-react"

export function Navbar() {
  const { user, userRole, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <nav className="w-full border-b border-indigo-100 bg-white sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          <span className="bg-gradient-to-r from-blue-500 to-violet-600 text-transparent bg-clip-text">
            Curriculum AI
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {!user ? (
            <>
              <Link
                href="/about"
                className={`text-gray-600 hover:text-gray-900 ${pathname === "/about" ? "font-medium" : ""}`}
              >
                About
              </Link>
              <Link href="/login">
                <Button variant="outline" className="border-blue-200 hover:border-blue-300">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white">
                  Sign up
                </Button>
              </Link>
            </>
          ) : (
            <>
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-6">
                <Link
                  href="/"
                  className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                    isActive("/") ? "font-medium" : ""
                  }`}
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Link>

                {userRole === "teacher" && (
                  <>
                    <Link
                      href="/dashboard/teacher"
                      className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                        isActive("/dashboard/teacher") ? "font-medium" : ""
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Lessons</span>
                    </Link>
                    <Link
                      href="/dashboard/teacher?tab=classrooms"
                      className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                        pathname.includes("/classrooms") ? "font-medium" : ""
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Classrooms</span>
                    </Link>
                    <Link
                      href="/dashboard/teacher?tab=assignments"
                      className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                        pathname.includes("/assignments") ? "font-medium" : ""
                      }`}
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Assignments</span>
                    </Link>
                  </>
                )}

                {userRole === "student" && (
                  <>
                    <Link
                      href="/dashboard/student/stream"
                      className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                        isActive("/dashboard/student/stream") ? "font-medium" : ""
                      }`}
                    >
                      <Activity className="h-4 w-4" />
                      <span>Stream</span>
                    </Link>
                    <Link
                      href="/dashboard/student"
                      className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                        isActive("/dashboard/student") && !isActive("/dashboard/student/stream") ? "font-medium" : ""
                      }`}
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Assignments</span>
                    </Link>
                    <Link
                      href="/dashboard/student?tab=classrooms"
                      className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                        pathname.includes("/classrooms") ? "font-medium" : ""
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Classrooms</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Navigation */}
              <div className="md:hidden">
                <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="border-blue-200">
                      Menu <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                      <Link href="/" className="flex items-center gap-2 cursor-pointer w-full">
                        <Home className="h-4 w-4" />
                        <span>Home</span>
                      </Link>
                    </DropdownMenuItem>

                    {userRole === "teacher" && (
                      <>
                        <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                          <Link href="/dashboard/teacher" className="flex items-center gap-2 cursor-pointer w-full">
                            <FileText className="h-4 w-4" />
                            <span>Lessons</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                          <Link
                            href="/dashboard/teacher?tab=classrooms"
                            className="flex items-center gap-2 cursor-pointer w-full"
                          >
                            <Users className="h-4 w-4" />
                            <span>Classrooms</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                          <Link
                            href="/dashboard/teacher?tab=assignments"
                            className="flex items-center gap-2 cursor-pointer w-full"
                          >
                            <BookOpen className="h-4 w-4" />
                            <span>Assignments</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    {userRole === "student" && (
                      <>
                        <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                          <Link
                            href="/dashboard/student/stream"
                            className="flex items-center gap-2 cursor-pointer w-full"
                          >
                            <Activity className="h-4 w-4" />
                            <span>Stream</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                          <Link href="/dashboard/student" className="flex items-center gap-2 cursor-pointer w-full">
                            <BookOpen className="h-4 w-4" />
                            <span>Assignments</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                          <Link
                            href="/dashboard/student?tab=classrooms"
                            className="flex items-center gap-2 cursor-pointer w-full"
                          >
                            <Users className="h-4 w-4" />
                            <span>Classrooms</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        handleSignOut()
                        setIsMenuOpen(false)
                      }}
                      className="text-red-600 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Sign Out Button (Desktop) */}
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900 hidden md:flex"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
