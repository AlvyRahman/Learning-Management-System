'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function Navbar() {
  const { user, role, logout } = useAuth();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/courses', label: 'Courses' },
    { href: '/blog', label: 'Blog' },
  ];

  if (role === 'admin' || role === 'content_manager' || role === 'instructor') {
    navLinks.push({ href: '/dashboard', label: 'Dashboard' });
  }
  if (role === 'admin') {
    navLinks.push({ href: '/admin/users', label: 'Users' });
  }
  if (role === 'student') {
    navLinks.push({ href: '/my-courses', label: 'My Courses' });
    navLinks.push({ href: '/results', label: 'Quiz Results' });
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold text-white">
          Learn<span className="text-blue-500">Central</span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-zinc-400 transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-white">{user.username}</p>
                  <p className="text-xs capitalize text-zinc-500">{role || 'user'}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}