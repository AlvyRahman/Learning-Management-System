'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { Course, Enrollment, Progress } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, EmptyState } from '@/components/ui';

interface AttemptRow {
  score: number;
  student?: { id: number; username: string; email: string };
  quiz?: { documentId: string; title: string };
}

interface StudentRow {
  student: { id: number; username: string; email: string };
  done: number;
  total: number;
  attempts: { title: string; score: number }[];
}

function ProgressDashboard() {
  const { role, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const isInstructor = role === 'instructor';

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<Course[]>('/courses', {
          populate: 'instructor,lessons,quizzes',
          sort: 'updatedAt:desc',
          'pagination[pageSize]': '200',
        });
        const filtered = isInstructor
          ? res.data.filter((c) => c.instructor?.id === user?.id)
          : res.data;
        setCourses(filtered);
        if (filtered.length > 0) setSelected(filtered[0].documentId);
      } catch {
        // ignore
      } finally {
        setLoadingCourses(false);
      }
    })();
  }, [isInstructor, user?.id]);

  const course = courses.find((c) => c.documentId === selected);
  const lessonIds = useMemo(() => (course?.lessons || []).map((l) => l.documentId), [course]);
  const quizIds = useMemo(() => (course?.quizzes || []).map((q) => q.documentId), [course]);

  useEffect(() => {
    if (!selected || !course) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingRows(true);
      try {
        const [enr, prog, att] = await Promise.all([
          apiGet<Enrollment[]>('/enrollments', {
            'filters[course][documentId][$eq]': selected,
            'populate[student]': 'true',
            'pagination[pageSize]': '500',
          }),
          apiGet<Progress[]>('/progresses', {
            'populate[student]': 'true',
            'populate[lesson]': 'true',
            'pagination[pageSize]': '5000',
          }),
          apiGet<AttemptRow[]>('/quiz-attempts', {
            'populate[student]': 'true',
            'populate[quiz]': 'true',
            'pagination[pageSize]': '5000',
          }),
        ]);
        if (cancelled) return;
        const quizTitles = new Map<string, string>();
        for (const a of att.data) if (a.quiz) quizTitles.set(a.quiz.documentId, a.quiz.title);

        const next = enr.data
          .filter((e) => e.student)
          .map((e) => {
            const sid = e.student!.id;
            const done = prog.data.filter(
              (p) => p.completed && p.student?.id === sid && lessonIds.includes(p.lesson?.documentId || '')
            ).length;
            const best = new Map<string, number>();
            for (const a of att.data) {
              if (a.student?.id !== sid || !a.quiz || !quizIds.includes(a.quiz.documentId)) continue;
              if ((best.get(a.quiz.documentId) ?? -1) < a.score) best.set(a.quiz.documentId, a.score);
            }
            const attempts = [...best.entries()].map(([qid, score]) => ({
              title: quizTitles.get(qid) || qid,
              score,
            }));
            return { student: e.student!, done, total: lessonIds.length, attempts };
          });
        next.sort((a, b) => a.student.username.localeCompare(b.student.username));
        setRows(next);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoadingRows(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, course, lessonIds, quizIds]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-blue-500 hover:text-blue-400">
        ← Content Dashboard
      </Link>
      <div className="mb-8 mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Student progress</h1>
          <p className="mt-1 text-zinc-400">
            {isInstructor
              ? 'Progress of students enrolled in your courses.'
              : 'Progress of students across all courses.'}
          </p>
        </div>
        {courses.length > 0 && (
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-blue-500"
          >
            {courses.map((c) => (
              <option key={c.documentId} value={c.documentId}>
                {c.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {loadingCourses ? (
        <p className="text-zinc-400">Loading...</p>
      ) : courses.length === 0 ? (
        <EmptyState
          message={isInstructor ? "You haven't created any courses yet." : 'No courses yet.'}
        />
      ) : loadingRows ? (
        <p className="text-zinc-400">Loading...</p>
      ) : rows.length === 0 ? (
        <EmptyState message="No students are enrolled in this course yet." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/70">
                <tr>
                  <th className="px-5 py-3 font-medium text-zinc-400">Student</th>
                  <th className="px-5 py-3 font-medium text-zinc-400">Lessons</th>
                  <th className="px-5 py-3 font-medium text-zinc-400">Quizzes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pct = r.total === 0 ? 0 : Math.round((r.done / r.total) * 100);
                  return (
                    <tr key={r.student.id} className="border-b border-zinc-800/50 last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium text-white">{r.student.username}</p>
                        <p className="text-xs text-zinc-500">{r.student.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-24 shrink-0 text-xs text-zinc-400">
                            {r.done} / {r.total}
                          </span>
                          <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-blue-400">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {r.attempts.length === 0 ? (
                          <span className="text-xs text-zinc-600">No attempts yet</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {r.attempts.map((a) => (
                              <span
                                key={a.title}
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  a.score >= 60
                                    ? 'bg-emerald-600/15 text-emerald-400'
                                    : 'bg-amber-600/15 text-amber-400'
                                }`}
                              >
                                {a.title}: {a.score}%
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function ProgressPage() {
  return (
    <ProtectedRoute roles={['admin', 'content_manager', 'instructor']}>
      <ProgressDashboard />
    </ProtectedRoute>
  );
}