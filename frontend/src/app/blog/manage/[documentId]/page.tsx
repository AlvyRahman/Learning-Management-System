'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPut, errorMessage } from '@/lib/api';
import { BlogPost } from '@/lib/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Input, Badge } from '@/components/ui';

function EditPost() {
  const params = useParams<{ documentId: string }>();
  const router = useRouter();
  const postId = params.documentId;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<BlogPost>('/blog-posts/' + postId);
      const post = res.data;
      setTitle(post.title || '');
      setBody(post.body || '');
      setCoverUrl(post.coverUrl || '');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiPut('/blog-posts/' + postId, {
        data: {
          title,
          body: body || null,
          coverUrl: coverUrl || null,
        },
      });
      router.push('/blog/manage');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
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
      <Link href="/blog/manage" className="text-sm text-blue-500 hover:text-blue-400">
        ← Manage blog
      </Link>
      <div className="mt-4 mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Edit post</h1>
        <Badge>Published</Badge>
      </div>

      <div className="flex flex-col gap-5">
        <Input label="Title" value={title} onChange={setTitle} />
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
          <Button onClick={save} disabled={busy}>
            {busy ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EditPostPage() {
  return (
    <ProtectedRoute roles={['admin', 'content_manager']}>
      <EditPost />
    </ProtectedRoute>
  );
}