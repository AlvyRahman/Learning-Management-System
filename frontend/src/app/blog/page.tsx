'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { BlogPost } from '@/lib/types';
import { Card, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<BlogPost[]>('/blog-posts', {
          populate: 'author',
          sort: 'publishedAt:desc',
        });
        setPosts(res.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-white">Blog</h1>
      <p className="mb-8 text-zinc-400">News, tips, and updates from the LearnCentral team.</p>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : posts.length === 0 ? (
        <EmptyState message="No published posts yet." />
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <Link key={post.documentId} href={`/blog/${post.documentId}`} className="block">
              <Card className="overflow-hidden transition hover:border-zinc-700">
                <div className="flex flex-col sm:flex-row">
                  {post.coverUrl && (
                    <div className="h-40 w-full shrink-0 sm:h-auto sm:w-48">
                      <img
                        src={post.coverUrl}
                        alt={post.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-white hover:text-blue-400">{post.title}</h2>
                    <p className="mt-2 text-xs text-zinc-500">
                      By {post.author?.username || 'LearnCentral'} · {formatDate(post.publishedAt)}
                    </p>
                    {post.body && (
                      <p className="mt-3 line-clamp-2 text-sm text-zinc-400">
                        {post.body.replace(/<[^>]+>/g, '').slice(0, 180)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}