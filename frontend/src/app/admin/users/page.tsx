'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGetRaw, apiPut, errorMessage } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, Button } from '@/components/ui';
import { roleLabel, formatDate } from '@/lib/utils';

interface UserRow {
  id: number;
  documentId: string;
  username: string;
  email: string;
  role?: { type: string };
  createdAt: string;
}

const ROLE_SLUGS = ['student', 'instructor', 'content_manager', 'admin'];

function UsersManagement() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await apiGetRaw<UserRow[]>('/users', {
        populate: 'role',
        sort: 'createdAt:asc',
        'pagination[pageSize]': '500',
      });
      setUsers(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (userId: number, role: string) => {
    setBusyId(userId);
    setErrors((e) => ({ ...e, [userId]: '' }));
    try {
      await apiPut(`/users/${userId}/role`, { role });
      await load();
    } catch (err) {
      setErrors((e) => ({ ...e, [userId]: errorMessage(err) }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/admin" className="text-sm text-blue-500 hover:text-blue-400">
        ← Admin dashboard
      </Link>
      <h1 className="mb-2 mt-4 text-3xl font-bold text-white">Manage Users</h1>
      <p className="mb-8 text-zinc-400">
        Assign or change user roles. You cannot change your own role.
      </p>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/70">
                <tr>
                  <th className="px-5 py-3 font-medium text-zinc-400">User</th>
                  <th className="px-5 py-3 font-medium text-zinc-400">Role</th>
                  <th className="px-5 py-3 font-medium text-zinc-400">Joined</th>
                  <th className="px-5 py-3 font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id} className="border-b border-zinc-800/50 last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium text-white">{u.username}</p>
                        <p className="text-xs text-zinc-500">{u.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            u.role?.type === 'admin'
                              ? 'bg-red-600/15 text-red-400'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {roleLabel(u.role?.type || 'unknown')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-zinc-400">{formatDate(u.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={u.role?.type || ''}
                            disabled={isSelf || busyId === u.id}
                            onChange={(e) => changeRole(u.id, e.target.value)}
                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500 disabled:opacity-50"
                          >
                            <option disabled value="">
                              Select role
                            </option>
                            {ROLE_SLUGS.map((r) => (
                              <option key={r} value={r}>
                                {roleLabel(r)}
                              </option>
                            ))}
                          </select>
                          {busyId === u.id && (
                            <span className="text-xs text-zinc-500">Saving...</span>
                          )}
                          {isSelf && (
                            <span className="text-xs text-zinc-600">(you)</span>
                          )}
                        </div>
                        {errors[u.id] && !isSelf && (
                          <p className="mt-1 text-xs text-red-400">{errors[u.id]}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute roles={['admin']}>
      <UsersManagement />
    </ProtectedRoute>
  );
}