'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { Course } from '@/lib/types';
import { CourseCard, EmptyState } from '@/components/ui';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<Course[]>('/courses', { populate: 'instructor', sort: 'createdAt:desc' });
        setCourses(res.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-white">All courses</h1>
      <p className="mb-8 text-zinc-400">Browse the full course catalog.</p>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : courses.length === 0 ? (
        <EmptyState message="No courses published yet." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.documentId}
              documentId={course.documentId}
              title={course.title}
              description={course.description}
              coverUrl={course.coverUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}