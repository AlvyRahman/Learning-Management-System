'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiPost, errorMessage } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Input } from '@/components/ui';

function NewPost() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const create = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSubmitting(true);
    try {
      await apiPost('/blog-posts', {
        data: {
          title,
          body: body || null,
          coverUrl: coverUrl || null,
        },
      });
      router.push('/blog/manage');
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/blog/manage" className="text-sm text-blue-500 hover:text-blue-400">
        ← Manage blog
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-bold text-white">New post</h1>

      <div className="flex flex-col gap-5">
        <Input label="Title" value={title} onChange={setTitle} placeholder="Post title" />
        <Input
          label="Cover image URL"
          value={coverUrl}
          onChange={setCoverUrl}
          placeholder="https://example.com/image.jpg"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Body (markdown or HTML)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {error && (
          <p className="rounded-lg border border-red-800/50 bg-red-600/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button onClick={create} disabled={submitting}>
            {submitting ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NewPostPage() {
  return (
    <ProtectedRoute roles={['admin', 'content_manager']}>
      <NewPost />
    </ProtectedRoute>
  );
}