'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { Course } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, Badge, EmptyState } from '@/components/ui';

function DashboardContent() {
  const { role, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const isInstructor = role === 'instructor';

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<Course[]>('/courses', {
          populate: 'instructor,lessons',
          sort: 'updatedAt:desc',
          'pagination[pageSize]': '200',
        });
        const filtered = isInstructor
          ? res.data.filter((c) => c.instructor?.id === user?.id)
          : res.data;
        setCourses(filtered);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [isInstructor, user?.id]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Content Dashboard</h1>
          <p className="mt-1 text-zinc-400">
            {isInstructor
              ? 'Manage your own courses and lessons.'
              : 'Manage all courses across the platform.'}
          </p>
        </div>
        <Link
          href="/dashboard/courses/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          + New course
        </Link>
      </div>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : courses.length === 0 ? (
        <EmptyState message={isInstructor ? "You haven't created any courses yet." : 'No courses yet.'} />
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const lessonCount = course.lessons?.length || 0;
            return (
              <Card key={course.documentId} className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="truncate text-lg font-semibold text-white">{course.title}</h2>
                      {isInstructor && <Badge>Own</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <Link
                      href={`/courses/${course.documentId}`}
                      className="text-sm text-zinc-400 hover:text-white"
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/courses/${course.documentId}/edit`}
                      className="text-sm font-medium text-blue-500 hover:text-blue-400"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-6">
        <Link href="/dashboard/progress" className="text-sm font-medium text-blue-500 hover:text-blue-400">
          View student progress →
        </Link>
        {!isInstructor && (
          <Link href="/blog/manage" className="text-sm font-medium text-blue-500 hover:text-blue-400">
            Manage blog posts →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute roles={['admin', 'content_manager', 'instructor']}>
      <DashboardContent />
    </ProtectedRoute>
  );
}