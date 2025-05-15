"use client"

import type React from "react"

import { useState, useEffect } from "react"
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

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      console.log("Navbar: Signing out...")
      await signOut()
      console.log("Navbar: Sign out completed")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleNavigation = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    console.log("Navigating to:", path)
    router.push(path)
  }

  useEffect(() => {
    console.log("Navbar: Current user role:", userRole)
  }, [userRole])

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
                <a
                  href="/"
                  onClick={handleNavigation("/")}
                  className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                    isActive("/") ? "font-medium" : ""
                  }`}
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </a>

                {userRole === "teacher" && (
                  <>
                    <a
                      href="/dashboard/teacher"
                      onClick={handleNavigation("/dashboard/teacher")}
                      className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                        isActive("/dashboard/teacher") ? "font-medium" : ""
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Lessons</span>
                    </a>
                    <a
                      href="/dashboard/teacher?tab=classrooms"
                      onClick={handleNavigation("/dashboard/teacher?tab=classrooms")}
                      className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                        pathname.includes("/classrooms") ? "font-medium" : ""
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Classrooms</span>
                    </a>
                    <a
                      href="/dashboard/teacher?tab=assignments"
                      onClick={handleNavigation("/dashboard/teacher?tab=assignments")}
                      className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                        pathname.includes("/assignments") ? "font-medium" : ""
                      }`}
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Assignments</span>
                    </a>
                  </>
                )}

                {userRole === "student" && (
                  <>
                    <a
                      href="/dashboard/student/stream"
                      onClick={handleNavigation("/dashboard/student/stream")}
                      className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                        isActive("/dashboard/student/stream") ? "font-medium" : ""
                      }`}
                    >
                      <Activity className="h-4 w-4" />
                      <span>Stream</span>
                    </a>
                    <a
                      href="/dashboard/student"
                      onClick={handleNavigation("/dashboard/student")}
                      className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                        isActive("/dashboard/student") && !isActive("/dashboard/student/stream") ? "font-medium" : ""
                      }`}
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Assignments</span>
                    </a>
                    <a
                      href="/dashboard/student?tab=classrooms"
                      onClick={handleNavigation("/dashboard/student?tab=classrooms")}
                      className={`text-gray-600 hover:text-gray-900 flex items-center gap-1 ${
                        pathname.includes("/classrooms") ? "font-medium" : ""
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Classrooms</span>
                    </a>
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
                      <a
                        href="/"
                        onClick={handleNavigation("/")}
                        className="flex items-center gap-2 cursor-pointer w-full"
                      >
                        <Home className="h-4 w-4" />
                        <span>Home</span>
                      </a>
                    </DropdownMenuItem>

                    {userRole === "teacher" && (
                      <>
                        <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                          <a
                            href="/dashboard/teacher"
                            onClick={handleNavigation("/dashboard/teacher")}
                            className="flex items-center gap-2 cursor-pointer w-full"
                          >
                            <FileText className="h-4 w-4" />
                            <span>Lessons</span>
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                          <a
                            href="/dashboard/teacher?tab=classrooms"
                            onClick={handleNavigation("/dashboard/teacher?tab=classrooms")}
                            className="flex items-center gap-2 cursor-pointer w-full"
                          >
                            <Users className="h-4 w-4" />
                            <span>Classrooms</span>
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                          <a
                            href="/dashboard/teacher?tab=assignments"
                            onClick={handleNavigation("/dashboard/teacher?tab=assignments")}
                            className="flex items-center gap-2 cursor-pointer w-full"
                          >
                            <BookOpen className="h-4 w-4" />
                            <span>Assignments</span>
                          </a>
                        </DropdownMenuItem>
                      </>
                    )}

                    {userRole === "student" && (
                      <>
                        <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                          <a
                            href="/dashboard/student/stream"
                            onClick={handleNavigation("/dashboard/student/stream")}
                            className="flex items-center gap-2 cursor-pointer w-full"
                          >
                            <Activity className="h-4 w-4" />
                            <span>Stream</span>
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                          <a
                            href="/dashboard/student"
                            onClick={handleNavigation("/dashboard/student")}
                            className="flex items-center gap-2 cursor-pointer w-full"
                          >
                            <BookOpen className="h-4 w-4" />
                            <span>Assignments</span>
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild onClick={() => setIsMenuOpen(false)}>
                          <a
                            href="/dashboard/student?tab=classrooms"
                            onClick={handleNavigation("/dashboard/student?tab=classrooms")}
                            className="flex items-center gap-2 cursor-pointer w-full"
                          >
                            <Users className="h-4 w-4" />
                            <span>Classrooms</span>
                          </a>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        handleSignOut(e as React.MouseEvent)
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
