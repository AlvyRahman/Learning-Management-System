'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPut, errorMessage } from '@/lib/api';
import { Lesson } from '@/lib/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Input } from '@/components/ui';

function EditLessonForm() {
  const params = useParams<{ documentId: string; lessonId: string }>();
  const router = useRouter();
  const courseId = params.documentId;
  const lessonId = params.lessonId;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [order, setOrder] = useState('1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<Lesson>('/lessons/' + lessonId);
      const lesson = res.data;
      setTitle(lesson.title || '');
      setContent(lesson.content || '');
      setVideoUrl(lesson.videoUrl || '');
      setOrder(String(lesson.order ?? 1));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPut('/lessons/' + lessonId, {
        data: {
          title,
          content: content || null,
          videoUrl: videoUrl || null,
          order: Number(order) || 1,
        },
      });
      router.push(`/dashboard/courses/${courseId}/edit`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-zinc-400">Loading...</p>
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
      <h1 className="mt-4 mb-8 text-3xl font-bold text-white">Edit lesson</h1>

      <form onSubmit={save} className="flex flex-col gap-5">
        <Input label="Lesson title" value={title} onChange={setTitle} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Order" type="number" value={order} onChange={setOrder} />
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
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {error && (
          <p className="rounded-lg border border-red-800/50 bg-red-600/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save lesson'}
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

export default function EditLessonPage() {
  return (
    <ProtectedRoute roles={['admin', 'content_manager', 'instructor']}>
      <EditLessonForm />
    </ProtectedRoute>
  );
}