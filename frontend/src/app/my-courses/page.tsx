'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { Course, Enrollment, Progress } from '@/lib/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { Card, EmptyState } from '@/components/ui';

interface EnrolledCourse {
  course: Course;
  enrollment: Enrollment;
  progress: Progress[];
}

function MyCoursesContent() {
  const { user } = useAuth();
  const [list, setList] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const enrollRes = await apiGet<Enrollment[]>('/enrollments', {
          populate: 'course',
          'pagination[pageSize]': '100',
        });
        const enrollments = enrollRes.data.filter((e) => e.student?.id === user?.id);
        const courses = await Promise.all(
          enrollments.map(async (e) => {
            if (!e.course?.documentId) return null;
            const courseRes = await apiGet<Course>('/courses/' + e.course.documentId, {
              populate: 'lessons',
            });
            return courseRes.data;
          })
        );
        const progressRes = await apiGet<Progress[]>('/progresses', {
          populate: 'lesson',
          'pagination[pageSize]': '1000',
        });
        const progress = progressRes.data;

        const merged: EnrolledCourse[] = enrollments
          .map((e) => {
            const course = courses.find((c) => c?.documentId === e.course?.documentId);
            if (!course) return null;
            const lessonIds = (course.lessons || []).map((l) => l.documentId);
            const done = progress.filter((p) => lessonIds.includes(p.lesson?.documentId || ''));
            return { course, enrollment: e, progress: done };
          })
          .filter((x): x is EnrolledCourse => x !== null);

        setList(merged);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-white">My Courses</h1>
      <p className="mb-8 text-zinc-400">Your enrolled courses and progress.</p>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : list.length === 0 ? (
        <EmptyState message="You haven't enrolled in any courses yet." />
      ) : (
        <div className="space-y-6">
          {list.map(({ course, progress }) => {
            const totalLessons = course.lessons?.length || 0;
            const doneCount = progress.filter((p) => p.completed).length;
            const pct = totalLessons === 0 ? 0 : Math.round((doneCount / totalLessons) * 100);

            return (
              <Card key={course.documentId} className="overflow-hidden">
                <div className="flex flex-col gap-6 p-6 sm:flex-row">
                  <div className="h-32 w-full shrink-0 rounded-lg bg-gradient-to-br from-blue-600/40 to-purple-600/40 sm:w-48">
                    {course.coverUrl ? (
                      <img src={course.coverUrl} alt={course.title} className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-lg">
                        <span className="text-4xl font-bold text-white/30">{course.title[0]?.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <h2 className="text-xl font-bold text-white">{course.title}</h2>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm text-zinc-400">
                          {doneCount} of {totalLessons} lessons completed
                        </span>
                        <span className="text-sm font-semibold text-blue-400">{pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      {totalLessons > 0 ? (
                        <Link
                          href={`/courses/${course.documentId}/lessons/${course.lessons![0].documentId}`}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                        >
                          Continue learning
                        </Link>
                      ) : (
                        <span className="text-sm text-zinc-500">No lessons yet</span>
                      )}
                      <Link
                        href={`/courses/${course.documentId}`}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500"
                      >
                        Course page
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MyCoursesPage() {
  return (
    <ProtectedRoute roles={['student']}>
      <MyCoursesContent />
    </ProtectedRoute>
  );
}