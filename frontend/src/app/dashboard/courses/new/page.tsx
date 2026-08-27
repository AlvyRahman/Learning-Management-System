'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost, errorMessage } from '@/lib/api';
import { Course } from '@/lib/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Input } from '@/components/ui';
import Link from 'next/link';

function CreateCourseForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<Course>('/courses', {
        data: {
          title,
          description: description || null,
          coverUrl: coverUrl || null,
        },
      });
      router.push(`/dashboard/courses/${res.data.documentId}/edit`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-blue-500 hover:text-blue-400">
        ← Dashboard
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-bold text-white">New course</h1>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <Input
          label="Course title"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Intro to Web Development"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Description (markdown or HTML)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will students learn?"
            rows={6}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Input
          label="Cover image URL"
          value={coverUrl}
          onChange={setCoverUrl}
          placeholder="https://example.com/image.jpg"
        />
        {error && (
          <p className="rounded-lg border border-red-800/50 bg-red-600/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create course'}
          </Button>
          <Link href="/dashboard" className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewCoursePage() {
  return (
    <ProtectedRoute roles={['admin', 'content_manager', 'instructor']}>
      <CreateCourseForm />
    </ProtectedRoute>
  );
}