'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { Course, BlogPost } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { CourseCard, Card, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export default function HomePage() {
  const { user, role } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, b] = await Promise.all([
          apiGet<Course[]>('/courses', { populate: '*', 'pagination[pageSize]': '6', sort: 'createdAt:desc' }),
          apiGet<BlogPost[]>('/blog-posts', { populate: '*', 'pagination[pageSize]': '3', sort: 'publishedAt:desc' }),
        ]);
        setCourses(c.data);
        setPosts(b.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <section className="border-b border-zinc-800 bg-gradient-to-b from-blue-950/40 to-zinc-950 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-white">
            Learn the skills that move your career forward.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-zinc-400">
            LearnCentral is a modern learning platform with structured courses, interactive quizzes, and
            progress tracking — built for serious learners.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/courses"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Browse courses
            </Link>
            {!user && (
              <Link
                href="/register"
                className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
              >
                Get started free
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Latest courses</h2>
          <Link href="/courses" className="text-sm font-medium text-blue-500 hover:text-blue-400">
            View all →
          </Link>
        </div>
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
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">From the blog</h2>
          <Link href="/blog" className="text-sm font-medium text-blue-500 hover:text-blue-400">
            View all →
          </Link>
        </div>
        {posts.length === 0 ? (
          <EmptyState message="No blog posts yet." />
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.documentId} href={`/blog/${post.documentId}`} className="group block">
                <Card className="overflow-hidden transition group-hover:border-zinc-700">
                  <div className="h-32 w-full bg-gradient-to-br from-purple-600/40 to-pink-600/40">
                    {post.coverUrl ? (
                      <img src={post.coverUrl} alt={post.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-3xl font-bold text-white/30">{post.title[0]?.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-white group-hover:text-blue-400">{post.title}</h3>
                    <p className="mt-2 text-xs text-zinc-500">
                      {post.author?.username} · {formatDate(post.publishedAt)}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
      {role === 'admin' && (
        <p className="sr-only">Signed in as {user?.username}</p>
      )}
    </div>
  );
}