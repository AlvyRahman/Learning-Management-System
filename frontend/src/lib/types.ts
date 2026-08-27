export type Role = 'admin' | 'content_manager' | 'instructor' | 'student';

export interface StrapiUser {
  id: number;
  documentId: string;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
  role?: {
    id: number;
    name: string;
    description: string;
    type: string;
  };
}

export interface Course {
  id: number;
  documentId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  lessons?: Lesson[];
  enrollments?: Enrollment[];
  quizzes?: Quiz[];
  instructor?: StrapiUser;
}

export interface Lesson {
  id: number;
  documentId: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  order: number | null;
  course?: { documentId: string; title: string };
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface Enrollment {
  id: number;
  documentId: string;
  enrolledAt: string;
  student?: StrapiUser;
  course?: { documentId: string; title: string };
  createdAt: string;
}

export interface Progress {
  id: number;
  documentId: string;
  completed: boolean;
  completedAt: string | null;
  student?: StrapiUser;
  lesson?: { documentId: string; title: string };
  createdAt: string;
}

export interface Question {
  id: number;
  documentId: string;
  text: string;
  options: string[];
  correctIndex?: number;
}

export interface Quiz {
  id: number;
  documentId: string;
  title: string;
  course?: { documentId: string; title: string };
  questions?: Question[];
  createdAt: string;
}

export interface QuizAttempt {
  id: number;
  documentId: string;
  score: number;
  answers: { chosen: number; correct: boolean; question: number }[];
  submittedAt: string | null;
  quiz?: { documentId: string; title: string };
  createdAt: string;
}

export interface BlogPost {
  id: number;
  documentId: string;
  title: string;
  body: string | null;
  coverUrl: string | null;
  author?: StrapiUser;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}