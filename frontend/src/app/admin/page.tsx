'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiGetRaw } from '@/lib/api';
import { Course, Enrollment, BlogPost } from '@/lib/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card } from '@/components/ui';

interface UserRow {
  id: number;
  username: string;
  email: string;
  role?: { type: string };
}

function AdminDashboard() {
  const [stats, setStats] = useState<{
    users: { total: number; roles: Record<string, number> };
    courses: number;
    enrollments: number;
    posts: number;
  }>({ users: { total: 0, roles: {} }, courses: 0, enrollments: 0, posts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [usersRes, coursesRes, enrollRes, postsRes] = await Promise.all([
          apiGetRaw<UserRow[]>('/users', { populate: 'role', 'pagination[pageSize]': '1000' }),
          apiGet<Course[]>('/courses', { 'pagination[pageSize]': '1000' }),
          apiGet<Enrollment[]>('/enrollments', { 'pagination[pageSize]': '1000' }),
          apiGet<BlogPost[]>('/blog-posts', { 'pagination[pageSize]': '1000' }),
        ]);
        const userList = usersRes;
        const roles: Record<string, number> = {};
        for (const u of userList) {
          const type = u.role?.type || 'unknown';
          roles[type] = (roles[type] || 0) + 1;
        }
        setStats({
          users: { total: userList.length, roles },
          courses: coursesRes.data.length,
          enrollments: enrollRes.data.length,
          posts: postsRes.data.length,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: 'Total users', value: stats.users.total, href: '/admin/users' },
    { label: 'Courses', value: stats.courses, href: '/dashboard' },
    { label: 'Enrollments', value: stats.enrollments, href: '/admin' },
    { label: 'Blog posts', value: stats.posts, href: '/blog/manage' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold text-white">Stats</h1>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.label} href={c.href}>
              <Card className="p-6 transition hover:border-zinc-700">
                <p className="text-4xl font-bold text-white">{c.value}</p>
                <p className="mt-1 text-sm text-zinc-400">{c.label}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-white">Users by role</h2>
        <Card className="p-6">
          <div className="grid gap-4 sm:grid-cols-4">
            {['admin', 'content_manager', 'instructor', 'student'].map((role) => (
              <div key={role} className="text-center">
                <p className="text-3xl font-bold text-blue-400">{stats.users.roles[role] || 0}</p>
                <p className="mt-1 text-xs capitalize text-zinc-500">
                  {role.replace('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/admin/users"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          Manage users & roles
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 transition hover:border-zinc-500"
        >
          Manage content
        </Link>
        <Link
          href="/blog/manage"
          className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm text-zinc-200 transition hover:border-zinc-500"
        >
          Manage blog
        </Link>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute roles={['admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  );
}