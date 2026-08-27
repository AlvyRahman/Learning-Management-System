'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPut, apiDelete, errorMessage } from '@/lib/api';
import { Course, Lesson } from '@/lib/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Card, Input, Badge } from '@/components/ui';

function CourseManage() {
  const params = useParams<{ documentId: string }>();
  const router = useRouter();
  const courseId = params.documentId;

  const [course, setCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<Course>('/courses/' + courseId, {
        populate: 'lessons,quizzes',
      });
      setCourse(res.data);
      setTitle(res.data.title);
      setDescription(res.data.description || '');
      setCoverUrl(res.data.coverUrl || '');
    } catch {
      setError('Course not found.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiPut('/courses/' + courseId, {
        data: { title, description: description || null, coverUrl: coverUrl || null },
      });
      setSaved(true);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async () => {
    if (!confirm('Delete this course and all its lessons and quizzes? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await apiDelete('/courses/' + courseId);
      router.push('/dashboard');
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(false);
    }
  };

  const deleteLesson = async (lesson: Lesson) => {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;
    try {
      await apiDelete('/lessons/' + lesson.documentId);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const deleteQuiz = async (quiz: { documentId: string; title: string }) => {
    if (!confirm(`Delete quiz "${quiz.title}" and its questions?`)) return;
    try {
      await apiDelete('/quizzes/' + quiz.documentId);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-zinc-400">{error}</p>
      </div>
    );
  }

  const lessons = [...(course.lessons || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const quizzes = course.quizzes || [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-blue-500 hover:text-blue-400">
        ← Dashboard
      </Link>
      <h1 className="mt-4 mb-2 text-3xl font-bold text-white">Manage course</h1>
      <Link
        href="/dashboard/progress"
        className="mb-8 inline-block text-sm font-medium text-blue-500 hover:text-blue-400"
      >
        View student progress →
      </Link>

      <form onSubmit={save} className="mb-10 flex flex-col gap-5">
        <Input label="Course title" value={title} onChange={setTitle} />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Input label="Cover image URL" value={coverUrl} onChange={setCoverUrl} />
        {error && (
          <p className="rounded-lg border border-red-800/50 bg-red-600/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
          <Button variant="danger" onClick={deleteCourse} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete course'}
          </Button>
          {saved && <p className="text-sm text-emerald-400">Saved ✓</p>}
        </div>
      </form>

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            Lessons <span className="text-sm font-normal text-zinc-500">({lessons.length})</span>
          </h2>
          <Link
            href={`/dashboard/courses/${course.documentId}/lessons/new`}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            + Add lesson
          </Link>
        </div>

        {lessons.length === 0 ? (
          <p className="text-sm text-zinc-500">No lessons yet. Add your first lesson.</p>
        ) : (
          <Card className="divide-y divide-zinc-800">
            {lessons.map((lesson, i) => (
              <div key={lesson.documentId} className="flex items-center gap-3 px-5 py-3">
                <span className="w-5 text-xs text-zinc-500">{lesson.order ?? i + 1}</span>
                <span className="flex-1 text-sm text-zinc-200">{lesson.title}</span>
                <Link
                  href={`/dashboard/courses/${course.documentId}/lessons/${lesson.documentId}/edit`}
                  className="text-xs text-blue-500 hover:text-blue-400"
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteLesson(lesson)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Quizzes</h2>
          <Link
            href={`/dashboard/courses/${course.documentId}/quizzes/new`}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            + New quiz
          </Link>
        </div>
        {quizzes.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No quizzes for this course yet. Create your first quiz.
          </p>
        ) : (
          <Card className="divide-y divide-zinc-800">
            {quizzes.map((quiz) => (
              <div key={quiz.documentId} className="flex items-center gap-3 px-5 py-3">
                <Badge>Quiz</Badge>
                <span className="flex-1 text-sm text-zinc-200">{quiz.title}</span>
                <Link
                  href={`/dashboard/courses/${course.documentId}/quizzes/${quiz.documentId}/edit`}
                  className="text-xs text-blue-500 hover:text-blue-400"
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteQuiz(quiz)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

export default function CourseEditPage() {
  return (
    <ProtectedRoute roles={['admin', 'content_manager', 'instructor']}>
      <CourseManage />
    </ProtectedRoute>
  );
}