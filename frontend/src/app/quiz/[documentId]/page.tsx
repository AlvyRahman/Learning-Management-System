'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPost, errorMessage } from '@/lib/api';
import { Quiz, Question } from '@/lib/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Card } from '@/components/ui';

function QuizView() {
  const params = useParams<{ documentId: string }>();
  const router = useRouter();
  const quizId = params.documentId;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    correct: number;
    total: number;
    answers: { correct: boolean }[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [quizRes, questionsRes] = await Promise.all([
          apiGet<Quiz>('/quizzes/' + quizId, { populate: 'course' }),
          apiGet<{ quiz: Quiz; questions: Question[] }>(
            '/quiz-submission/quiz-questions/' + quizId
          ),
        ]);
        setQuiz({ ...quizRes.data, questions: questionsRes.data.questions });
        setQuestions(questionsRes.data.questions);
        setAnswers(new Array(questionsRes.data.questions.length).fill(-1));
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

  const submit = async () => {
    if (!quiz) return;
    if (answers.some((a) => a < 0)) {
      setError('Please answer every question before submitting.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost<{ score: number; correct: number; total: number; answers: { correct: boolean }[] }>(
        '/quiz-attempts/submit',
        { quiz: quiz.documentId, answers }
      );
      setResult(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!quiz || error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-zinc-400">{error || 'Quiz not found.'}</p>
      </div>
    );
  }

  if (result) {
    const passed = result.score >= 60;
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 text-center">
        <div className="mb-6 text-6xl">{passed ? '🎉' : '📚'}</div>
        <h1 className="mb-2 text-3xl font-bold text-white">
          {passed ? 'Great job!' : 'Good effort!'}
        </h1>
        <p className="text-zinc-400">
          You scored {result.correct} out of {result.total} correct.
        </p>
        <div className="mx-auto mt-6 h-4 w-full max-w-sm overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full ${passed ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${result.score}%` }}
          />
        </div>
        <p className={`mt-2 text-2xl font-bold ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
          {result.score}%
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button variant="secondary" onClick={() => router.push(`/courses/${quiz.course?.documentId || ''}`)}>
            Back to course
          </Button>
          <Button onClick={() => router.push('/my-courses')}>My Courses</Button>
        </div>
      </div>
    );
  }

  const answeredCount = answers.filter((a) => a >= 0).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <nav className="mb-4 text-sm text-zinc-500">
        <span className="text-zinc-300">{quiz.title}</span>
      </nav>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
          {answeredCount}/{questions.length} answered
        </span>
      </div>

      <div className="space-y-6">
        {questions.map((question, qi) => (
          <Card key={question.documentId} className="p-6">
            <p className="mb-4 font-medium text-zinc-100">
              {qi + 1}. {question.text}
            </p>
            <div className="space-y-2">
              {(Array.isArray(question.options) ? question.options : []).map((option, oi) => (
                <button
                  key={oi}
                  onClick={() =>
                    setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))
                  }
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                    answers[qi] === oi
                      ? 'border-blue-500 bg-blue-600/10 text-white'
                      : 'border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                      answers[qi] === oi ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {String.fromCharCode(65 + oi)}
                  </span>
                  {option}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-red-800/50 bg-red-600/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-8">
        <Button
          onClick={submit}
          disabled={submitting || answeredCount < questions.length}
          className="w-full !py-3 text-base"
        >
          {submitting ? 'Grading...' : 'Submit quiz'}
        </Button>
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <ProtectedRoute roles={['student', 'instructor', 'admin', 'content_manager']}>
      <QuizView />
    </ProtectedRoute>
  );
}