'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { QuizAttempt } from '@/lib/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/utils';

function ResultsContent() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const enrol = await apiGet<QuizAttempt[]>('/quiz-attempts', {
          populate: 'quiz',
          sort: 'createdAt:desc',
          'pagination[pageSize]': '50',
        });
        setAttempts(enrol.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-white">My Quiz Results</h1>
      <p className="mb-8 text-zinc-400">Your past quiz attempts and scores.</p>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : attempts.length === 0 ? (
        <EmptyState message="You haven't taken any quizzes yet." />
      ) : (
        <div className="space-y-3">
          {attempts.map((attempt) => (
            <Card key={attempt.documentId} className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="font-medium text-white">{attempt.quiz?.title || 'Quiz'}</h2>
                <p className="text-xs text-zinc-500">
                  Taken {formatDate(attempt.submittedAt)}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-xl font-bold ${
                    attempt.score >= 60 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {attempt.score}%
                </span>
                <p className="text-xs text-zinc-500">{attempt.score >= 60 ? 'Passed' : 'Try again'}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-8">
        <Link href="/my-courses" className="text-sm font-medium text-blue-500 hover:text-blue-400">
          ← Back to My Courses
        </Link>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <ProtectedRoute roles={['student']}>
      <ResultsContent />
    </ProtectedRoute>
  );
}