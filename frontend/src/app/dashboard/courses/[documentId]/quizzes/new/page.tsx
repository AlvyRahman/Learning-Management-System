'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import QuizForm from '@/components/QuizForm';
import ProtectedRoute from '@/components/ProtectedRoute';

function NewQuizPageContent() {
  const params = useParams<{ documentId: string }>();
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/dashboard/courses/${params.documentId}/edit`}
        className="text-sm text-blue-500 hover:text-blue-400"
      >
        ← Back to course
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-bold text-white">New quiz</h1>
      <QuizForm courseId={params.documentId} />
    </div>
  );
}

export default function NewQuizPage() {
  return (
    <ProtectedRoute roles={['admin', 'content_manager', 'instructor']}>
      <NewQuizPageContent />
    </ProtectedRoute>
  );
}