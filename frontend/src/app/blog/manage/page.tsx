'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiDelete, errorMessage } from '@/lib/api';
import { BlogPost } from '@/lib/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, Badge, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/utils';

function BlogManage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<BlogPost[]>('/blog-posts', {
        populate: 'author',
        sort: 'updatedAt:desc',
        'pagination[pageSize]': '200',
      });
      setPosts(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deletePost = async (post: BlogPost) => {
    if (!confirm(`Delete post "${post.title}"?`)) return;
    setBusy(post.documentId);
    try {
      await apiDelete('/blog-posts/' + post.documentId);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Manage Blog</h1>
          <p className="mt-1 text-zinc-400">
            Create, edit, publish, and delete blog posts.
          </p>
        </div>
        <Link
          href="/blog/manage/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          + New post
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-800/50 bg-red-600/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : posts.length === 0 ? (
        <EmptyState message="No blog posts yet." />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.documentId} className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="truncate text-lg font-semibold text-white">{post.title}</h2>
                    <Badge>Published</Badge>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Updated {formatDate(post.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <Link
                    href={`/blog/manage/${post.documentId}`}
                    className="text-sm text-blue-500 hover:text-blue-400"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deletePost(post)}
                    disabled={busy === post.documentId}
                    className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BlogManagePage() {
  return (
    <ProtectedRoute roles={['admin', 'content_manager']}>
      <BlogManage />
    </ProtectedRoute>
  );
}