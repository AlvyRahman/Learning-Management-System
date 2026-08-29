'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost, errorMessage } from '@/lib/api';
import { Course, Lesson } from '@/lib/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input } from '@/components/ui';

function NewLessonForm() {
  const params = useParams<{ documentId: string }>();
  const router = useRouter();
  const { user, role } = useAuth();
  const courseId = params.documentId;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [order, setOrder] = useState('1');
  const [availableOrders, setAvailableOrders] = useState<string[]>(['1']);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);
  const [courseLoaded, setCourseLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiGet<Course>('/courses/' + courseId + '?populate=lessons');
        setNotAllowed(
          role === 'instructor' &&
            Boolean(res.data.instructor?.id) &&
            res.data.instructor!.id !== user?.id
        );
        const lessons = res.data.lessons || [];
        const taken = new Set(
          lessons.flatMap((l: Lesson) => (typeof l.order === 'number' ? [l.order] : []))
        );
        const options: string[] = [];
        for (let n = 1; n <= lessons.length + 1; n++) {
          if (!taken.has(n)) options.push(String(n));
        }
        if (options.length === 0) options.push(String(lessons.length + 1));
        setAvailableOrders(options);
        setOrder(options[0]);
      } catch {
        setAvailableOrders(['1']);
        setOrder('1');
      } finally {
        setCourseLoaded(true);
      }
    };
    load();
  }, [courseId, role, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<Lesson>('/lessons', {
        data: {
          title,
          content: content || null,
          videoUrl: videoUrl || null,
          order: Number(order) || 1,
          course: courseId,
        },
      });
      router.push(`/courses/${courseId}/lessons/${res.data.documentId}`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  if (courseLoaded && notAllowed) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/dashboard" className="text-sm text-blue-500 hover:text-blue-400">
          ← Dashboard
        </Link>
        <div className="mt-4 rounded-lg border border-red-800/50 bg-red-600/10 px-5 py-6">
          <h1 className="text-xl font-bold text-red-400">403 — Not allowed</h1>
          <p className="mt-2 text-sm text-zinc-300">
            You can only manage courses you own. This course belongs to another instructor or an
            admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/dashboard/courses/${courseId}/edit`}
        className="text-sm text-blue-500 hover:text-blue-400"
      >
        ← Back to course
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-bold text-white">New lesson</h1>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <Input label="Lesson title" value={title} onChange={setTitle} placeholder="e.g. HTML Basics" />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">Order</label>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {availableOrders.map((n) => (
                <option key={n} value={n}>
                  Lesson {n}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Video URL (optional)"
            value={videoUrl}
            onChange={setVideoUrl}
            placeholder="https://example.com/video.mp4"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Content (markdown or HTML)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="Lesson material..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {error && (
          <p className="rounded-lg border border-red-800/50 bg-red-600/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create lesson'}
          </Button>
          <Link
            href={`/dashboard/courses/${courseId}/edit`}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewLessonPage() {
  return (
    <ProtectedRoute roles={['admin', 'content_manager', 'instructor']}>
      <NewLessonForm />
    </ProtectedRoute>
  );
}