'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function Footer() {
  const { user, role } = useAuth();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/courses', label: 'Courses' },
    { href: '/blog', label: 'Blog' },
  ];

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="text-lg font-bold text-white">
            Learn<span className="text-blue-500">Central</span>
          </p>
          <p className="mt-1 max-w-xs text-sm text-zinc-500">
            A modern learning management system for courses, lessons, and quizzes.
          </p>
        </div>

        <nav className="flex flex-col items-center gap-2 sm:items-start">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Explore
          </p>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-zinc-400 transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>

        {user && role ? (
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Account
            </p>
            {role === 'student' && (
              <Link href="/my-courses" className="text-sm text-zinc-400 transition hover:text-white">
                My Courses
              </Link>
            )}
            {(role === 'instructor' || role === 'admin' || role === 'content_manager') && (
              <Link href="/dashboard" className="text-sm text-zinc-400 transition hover:text-white">
                Dashboard
              </Link>
            )}
            {role === 'student' && (
              <Link href="/results" className="text-sm text-zinc-400 transition hover:text-white">
                Quiz Results
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Account
            </p>
            <Link href="/login" className="text-sm text-zinc-400 transition hover:text-white">
              Log in
            </Link>
            <Link href="/register" className="text-sm text-zinc-400 transition hover:text-white">
              Create an account
            </Link>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800/70 py-4 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} LearnCentral · Developed by{' '}
        <span className="font-medium text-zinc-300">Alvy Rahman</span>
      </div>
    </footer>
  );
}