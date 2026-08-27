'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { BlogPost } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function BlogPostPage() {
  const params = useParams<{ documentId: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<BlogPost>('/blog-posts/' + params.documentId, {
          populate: 'author',
        });
        setPost(res.data);
      } catch {
        setNotFound(true);
      }
    })();
  }, [params.documentId]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-zinc-400">Post not found or not published yet.</p>
        <Link href="/blog" className="text-blue-500">
          ← Back to blog
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/blog" className="text-sm text-blue-500 hover:text-blue-400">
        ← Back to blog
      </Link>

      {post.coverUrl && (
        <div className="mt-6 overflow-hidden rounded-xl">
          <img src={post.coverUrl} alt={post.title} className="h-64 w-full object-cover" />
        </div>
      )}

      <h1 className="mt-6 text-4xl font-bold text-white">{post.title}</h1>
      <p className="mt-3 text-sm text-zinc-500">
        By {post.author?.username || 'LearnCentral'} · {formatDate(post.publishedAt)}
      </p>

      {post.body && (
        <div className="prose-strapi mt-8" dangerouslySetInnerHTML={{ __html: post.body }} />
      )}
    </article>
  );
}