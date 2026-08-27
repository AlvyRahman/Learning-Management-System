'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost, getToken } from '@/lib/api';
import { Lesson, Course, Enrollment, Progress } from '@/lib/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui';

function LessonView() {
  const params = useParams<{ documentId: string; lessonId: string }>();
  const { role } = useAuth();
  const courseId = params.documentId;
  const lessonId = params.lessonId;

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [authz, setAuthz] = useState<'loading' | 'ok' | 'denied' | 'notfound'>('loading');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setAuthz('denied');
      return;
    }

    try {
      const [courseRes, lessonRes] = await Promise.all([
        apiGet<Course>('/courses/' + courseId, { populate: 'lessons,instructor,quizzes' }),
        apiGet<Lesson>('/lessons/' + lessonId, { populate: 'course' }),
      ]);
      setCourse(courseRes.data);
      setLesson(lessonRes.data);

      if (lessonRes.data.course?.documentId !== courseId) {
        setAuthz('notfound');
        return;
      }

      const isStaff = role === 'admin' || role === 'content_manager' || role === 'instructor';

      if (!isStaff) {
        const enrollRes = await apiGet<Enrollment[]>('/enrollments', {
          'filters[course][documentId][$eq]': courseId,
          'pagination[pageSize]': '1',
        });
        if (enrollRes.data.length === 0) {
          setAuthz('denied');
          return;
        }
      }

      setAuthz('ok');

      const progRes = await apiGet<Progress[]>('/progresses', {
        populate: 'lesson',
        'filters[lesson][documentId][$eq]': lessonId,
        'pagination[pageSize]': '1',
      });
      setProgress(progRes.data[0] || null);
    } catch {
      setAuthz('notfound');
    }
  }, [courseId, lessonId, role]);

  useEffect(() => {
    load();
  }, [load]);

  const markComplete = async () => {
    if (!lesson) return;
    setSaving(true);
    try {
      await apiPost('/progresses', { data: { lesson: lesson.documentId, completed: true } });
      const res = await apiGet<Progress[]>('/progresses', {
        populate: 'lesson',
        'filters[lesson][documentId][$eq]': lessonId,
        'pagination[pageSize]': '1',
      });
      setProgress(res.data[0] || null);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const sortedLessons = useMemo(
    () => [...(course?.lessons || [])].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [course]
  );
  const idx = sortedLessons.findIndex((l) => l.documentId === lessonId);
  const prevLesson = idx > 0 ? sortedLessons[idx - 1] : null;
  const nextLesson = idx >= 0 && idx < sortedLessons.length - 1 ? sortedLessons[idx + 1] : null;

  if (authz === 'loading') {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (authz === 'notfound') {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-zinc-400">Lesson not found.</p>
        <Link href="/courses" className="text-blue-500">
          Browse courses
        </Link>
      </div>
    );
  }

  if (authz === 'denied') {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 text-center">
        <h1 className="mb-2 text-2xl font-bold text-white">Enrollment required</h1>
        <p className="mb-6 text-zinc-400">
          You must enroll in this course before viewing its lessons.
        </p>
        <Link
          href={`/courses/${course?.documentId || courseId}`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          View course
        </Link>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <nav className="mb-4 text-sm text-zinc-500">
        <Link href={`/courses/${courseId}`} className="hover:text-zinc-300">
          {course?.title}
        </Link>{' '}
        / <span className="text-zinc-300">{lesson.title}</span>
      </nav>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Lesson {idx >= 0 ? idx + 1 : '?'} of {sortedLessons.length}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">{lesson.title}</h1>
        </div>
        {progress?.completed ? (
          <span className="rounded-full bg-emerald-600/15 px-3 py-1 text-sm font-medium text-emerald-400">
            ✓ Completed
          </span>
        ) : (
          <Button onClick={markComplete} disabled={saving} variant="secondary">
            {saving ? 'Saving...' : 'Mark complete'}
          </Button>
        )}
      </div>

      {lesson.videoUrl && (
        <div className="mb-8 aspect-video w-full overflow-hidden rounded-xl border border-zinc-800">
          <video src={lesson.videoUrl} controls className="h-full w-full bg-black" />
        </div>
      )}

      {lesson.content && (
        <div className="prose-strapi mb-10" dangerouslySetInnerHTML={{ __html: lesson.content }} />
      )}

      <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
        {prevLesson ? (
          <Link
            href={`/courses/${courseId}/lessons/${prevLesson.documentId}`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500"
          >
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {nextLesson ? (
          <Link
            href={`/courses/${courseId}/lessons/${nextLesson.documentId}`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Next lesson →
          </Link>
        ) : (
          <Link
            href={`/courses/${courseId}`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Finish course →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function LessonPage() {
  return (
    <ProtectedRoute roles={['student', 'instructor', 'admin', 'content_manager']}>
      <LessonView />
    </ProtectedRoute>
  );
}