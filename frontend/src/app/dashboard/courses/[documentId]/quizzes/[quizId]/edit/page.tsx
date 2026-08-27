'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import QuizForm from '@/components/QuizForm';
import ProtectedRoute from '@/components/ProtectedRoute';

function EditQuizPageContent() {
  const params = useParams<{ documentId: string; quizId: string }>();
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/dashboard/courses/${params.documentId}/edit`}
        className="text-sm text-blue-500 hover:text-blue-400"
      >
        ← Back to course
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-bold text-white">Edit quiz</h1>
      <QuizForm courseId={params.documentId} quizId={params.quizId} />
    </div>
  );
}

export default function EditQuizPage() {
  return (
    <ProtectedRoute roles={['admin', 'content_manager', 'instructor']}>
      <EditQuizPageContent />
    </ProtectedRoute>
  );
}