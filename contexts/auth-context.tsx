"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Session, User } from "@supabase/supabase-js"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { UserRole } from "@/lib/types"

interface AuthContextType {
  user: User | null
  session: Session | null
  userRole: UserRole | null
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<{ error?: string }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  isEmailConfirmed: (email: string) => Promise<boolean>
  redirectToRoleDashboard: (role: UserRole) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // Clean, reusable function to redirect based on role
  const redirectToRoleDashboard = (role: UserRole) => {
    if (role === "teacher") {
      router.push("/dashboard/teacher")
    } else if (role === "student") {
      router.push("/dashboard/student")
    } else {
      // Fallback for unknown roles
      console.warn(`Unknown role: ${role}, redirecting to home`)
      router.push("/")
    }
  }

  useEffect(() => {
    const fetchSession = async () => {
      try {
        console.time("getSession")
        const {
          data: { session },
        } = await supabase.auth.getSession()
        console.timeEnd("getSession")

        setSession(session)
        setUser(session?.user || null)

        if (session?.user) {
          try {
            // Fetch user role from the database
            console.time("fetchUserRole")
            const { data, error } = await supabase.from("users").select("role").eq("id", session.user.id).single()
            console.timeEnd("fetchUserRole")

            if (data && !error) {
              const role = data.role as UserRole
              setUserRole(role)

              // Auto-redirect if on login or signup pages
              const pathname = window.location.pathname
              if (pathname === "/login" || pathname === "/signup") {
                redirectToRoleDashboard(role)
              }
            } else {
              console.error("Error fetching user role:", error)
            }
          } catch (error) {
            console.error("Error in session handling:", error)
          }
        }
      } catch (error) {
        console.error("Error fetching session:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event)
      setSession(session)
      setUser(session?.user || null)

      if (session?.user) {
        try {
          // Fetch user role from the database
          console.time("fetchUserRoleOnChange")
          const { data, error } = await supabase.from("users").select("role").eq("id", session.user.id).single()
          console.timeEnd("fetchUserRoleOnChange")

          if (data && !error) {
            const role = data.role as UserRole
            setUserRole(role)

            // Redirect on sign in events
            if (event === "SIGNED_IN") {
              redirectToRoleDashboard(role)
            }
          } else {
            // If we can't find the user in our custom table, check user metadata
            const authUserData = session.user.user_metadata
            if (authUserData && authUserData.role) {
              const metadataRole = authUserData.role as UserRole
              setUserRole(metadataRole)

              // Create the user record if it doesn't exist
              try {
                // First check if the user already exists
                const { data: existingUser } = await supabase
                  .from("users")
                  .select("id")
                  .eq("id", session.user.id)
                  .single()

                if (!existingUser) {
                  // User doesn't exist, so insert
                  await supabase.from("users").insert([
                    {
                      id: session.user.id,
                      email: session.user.email,
                      role: metadataRole,
                      full_name: authUserData.full_name || "",
                    },
                  ])
                }
              } catch (insertError) {
                console.error("Error inserting user:", insertError)
              }

              if (event === "SIGNED_IN") {
                redirectToRoleDashboard(metadataRole)
              }
            }
          }
        } catch (error) {
          console.error("Error in auth state change:", error)
        }
      } else {
        setUserRole(null)

        // If signed out, redirect to home page
        if (event === "SIGNED_OUT") {
          router.push("/")
        }
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  // Helper function to get the correct redirect URL
  const getRedirectUrl = () => {
    return `${window.location.origin}/auth/callback`
  }

  const isEmailConfirmed = async (email: string): Promise<boolean> => {
    try {
      // This is a workaround since there's no direct API to check if an email is confirmed
      // We try to sign in with a dummy password and check the error message
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: "dummy-password-that-will-fail",
      })

      // If the error message mentions "Invalid login credentials", the email is confirmed
      // If it mentions "Email not confirmed", the email is not confirmed
      if (error) {
        return error.message.includes("Invalid login credentials")
      }

      // If no error (which is unlikely with a dummy password), assume email is confirmed
      return true
    } catch (error) {
      console.error("Error checking email confirmation status:", error)
      return false
    }
  }

  const signUp = async (email: string, password: string, role: UserRole, fullName: string) => {
    try {
      setLoading(true)

      // Check if a user with this email already exists in our custom users table
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id, email, role")
        .eq("email", email)
        .maybeSingle()

      if (checkError) {
        console.error("Error checking for existing user:", checkError)
      }

      // If the user already exists in our custom table, we'll try to sign in instead
      if (existingUser) {
        console.log("User already exists in custom table, attempting to sign in")

        // Try to sign in with the provided credentials
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          // If sign in fails, it might be because the password is different
          // In this case, we should let the user know they already have an account
          return { error: "An account with this email already exists. Please log in instead." }
        }

        if (signInData.user) {
          setUserRole(existingUser.role as UserRole)
          redirectToRoleDashboard(existingUser.role as UserRole)
          return { error: undefined }
        }
      } else {
        // User doesn't exist in our custom table, proceed with normal signup
        // Get the correct redirect URL
        const redirectUrl = getRedirectUrl()
        console.log("Using redirect URL:", redirectUrl)

        // First, sign up the user with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
            emailRedirectTo: redirectUrl,
          },
        })

        if (error) throw error

        if (data.user) {
          try {
            // Insert the user into our custom users table
            try {
              // First check if the user already exists
              const { data: existingUser } = await supabase.from("users").select("id").eq("id", data.user.id).single()

              if (!existingUser) {
                // User doesn't exist, so insert
                const { error: insertError } = await supabase.from("users").insert([
                  {
                    id: data.user.id,
                    email,
                    role,
                    full_name: fullName,
                  },
                ])

                if (insertError) {
                  console.error("Error inserting user data:", insertError)
                }
              } else {
                // User exists, so update
                const { error: updateError } = await supabase
                  .from("users")
                  .update({ role, full_name: fullName })
                  .eq("id", data.user.id)

                if (updateError) {
                  console.error("Error updating user data:", updateError)
                }
              }
            } catch (insertError) {
              console.error("Exception inserting user data:", insertError)
            }

            // Check if email confirmation is required
            if (data.session) {
              // User is automatically signed in (email confirmation not required)
              setUserRole(role)
              redirectToRoleDashboard(role)
              return { error: undefined }
            } else {
              // Email confirmation is required
              return {
                error:
                  "Please check your email for a confirmation link. Note: In preview environments, the link might point to localhost. Please replace 'localhost:3000' with the actual URL of this application in your browser.",
              }
            }
          } catch (insertError) {
            console.error("Exception inserting user data:", insertError)
          }
        }
      }
      return { error: undefined }
    } catch (error: any) {
      console.error("Error signing up:", error)
      return { error: error.message || "An error occurred during signup" }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      console.time("signInWithPassword")
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      console.timeEnd("signInWithPassword")

      if (error) {
        // Check if the error is due to email not being confirmed
        if (error.message.includes("Email not confirmed")) {
          return { error: "Please confirm your email before logging in. Check your inbox for a confirmation link." }
        }
        throw error
      }

      if (data.user) {
        try {
          // Fetch user role from the database
          console.time("fetchUserRoleAfterSignIn")
          const { data: userData, error: roleError } = await supabase
            .from("users")
            .select("role")
            .eq("id", data.user.id)
            .single()
          console.timeEnd("fetchUserRoleAfterSignIn")

          if (roleError) {
            // If we can't find the user in our custom table, try to create it
            // This handles cases where the auth user exists but our custom record doesn't
            const authUserData = data.user.user_metadata
            if (authUserData && authUserData.role) {
              const metadataRole = authUserData.role as UserRole

              try {
                // First check if the user already exists
                const { data: existingUser } = await supabase.from("users").select("id").eq("id", data.user.id).single()

                if (!existingUser) {
                  // User doesn't exist, so insert
                  await supabase.from("users").insert([
                    {
                      id: data.user.id,
                      email: data.user.email,
                      role: metadataRole,
                      full_name: authUserData.full_name || "",
                    },
                  ])
                }
              } catch (insertError) {
                console.error("Error inserting user:", insertError)
              }

              setUserRole(metadataRole)
              redirectToRoleDashboard(metadataRole)
              return { error: undefined }
            }

            throw new Error("User role not found")
          }

          const role = userData.role as UserRole
          setUserRole(role)
          redirectToRoleDashboard(role)
          return { error: undefined }
        } catch (error) {
          console.error("Error handling role after sign in:", error)
          return { error: "Error retrieving user role. Please try again." }
        }
      }
      return { error: undefined }
    } catch (error: any) {
      console.error("Error signing in:", error)
      return { error: error.message || "Invalid email or password" }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setUserRole(null)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    userRole,
    signUp,
    signIn,
    signOut,
    isEmailConfirmed,
    redirectToRoleDashboard,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
