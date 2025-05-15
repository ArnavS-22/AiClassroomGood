export type UserRole = "teacher" | "student"

export interface User {
  id: string
  email: string
  role: UserRole
  full_name?: string
}

export interface Lesson {
  id: string
  title: string
  description: string
  grade_level: string
  subject: string
  file_url: string
  created_at: string
  teacher_id: string
}

export interface Classroom {
  id: string
  name: string
  description?: string
  teacher_id: string
  join_code?: string
  created_at: string
  grade_level?: string
  student_count: number
}

export interface ClassroomLesson {
  id: string
  classroom_id: string
  lesson_id: string
  teacher_id: string
  visible: boolean
  created_at: string
  updated_at: string
  lesson?: Lesson
  classroom?: Classroom
}

export interface ClassroomStudent {
  classroom_id: string
  student_id: string
  joined_at: string
  student?: User
}

export interface Assignment {
  id: string
  title: string
  description: string
  classroom_id: string
  lesson_id: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  lesson?: Lesson | null
  classroom?: Classroom
  teacher_id: string
}

export interface AssignmentSubmission {
  id: string
  assignment_id: string
  student_id: string
  status: "not_started" | "in_progress" | "completed"
  submitted_at: string | null
  feedback: string | null
  grade: string | null
  created_at: string
  updated_at: string
  student?: User
}

export interface Message {
  id: string
  user_id: string
  lesson_id: string
  role: "student" | "ai"
  message_text: string
  timestamp: string
}
