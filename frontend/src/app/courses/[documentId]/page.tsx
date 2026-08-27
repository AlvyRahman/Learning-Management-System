'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost, getToken, errorMessage } from '@/lib/api';
import { Course, Enrollment } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { Card, Button } from '@/components/ui';
import { formatDate, roleLabel } from '@/lib/utils';

export default function CourseDetailPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId;
  const router = useRouter();
  const { user, hasRole } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEnrollment = useCallback(async () => {
    if (!getToken()) {
      setEnrollment(null);
      return;
    }
    try {
      const res = await apiGet<Enrollment[]>('/enrollments', {
        populate: 'course',
        'filters[course][documentId][$eq]': documentId,
        'pagination[pageSize]': '100',
      });
      setEnrollment(res.data.find((e) => e.student?.id === user?.id) || null);
    } catch {
      setEnrollment(null);
    }
  }, [documentId, user?.id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<Course>('/courses/' + documentId, {
          populate: 'lessons,instructor,enrollments,quizzes',
        });
        setCourse(res.data);
      } catch {
        setError('Course not found.');
      } finally {
        setLoading(false);
      }
    })();
  }, [documentId]);

  useEffect(() => {
    loadEnrollment();
  }, [loadEnrollment, user?.id]);

  const handleEnroll = async () => {
    setEnrolling(true);
    setError(null);
    try {
      await apiPost('/enrollments', { data: { course: documentId } });
      await loadEnrollment();
    } catch (err) {
      const msg = errorMessage(err);
      setError(/already/i.test(msg) && !/failed/i.test(msg) ? 'You are already enrolled in this course.' : msg);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-zinc-400">{error || 'Course not found.'}</p>
      </div>
    );
  }

  const lessons = [...(course.lessons || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const quizzes = course.quizzes || [];
  const ownCourse = course.instructor?.id === user?.id;
  const isStaff = hasRole('admin', 'content_manager', 'instructor');
  const canManage = ownCourse || hasRole('admin', 'content_manager');
  const canPreviewQuiz = canManage;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="mb-6 h-64 w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-600/40 to-purple-600/40">
            {course.coverUrl ? (
              <img src={course.coverUrl} alt={course.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <h1 className="text-6xl font-bold text-white/30">{course.title[0]?.toUpperCase()}</h1>
              </div>
            )}
          </div>

          {course.description && (
            <div
              className="prose-strapi mb-8"
              dangerouslySetInnerHTML={{ __html: course.description }}
            />
          )}

          {lessons.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-bold text-white">
                Lessons <span className="text-sm font-normal text-zinc-500">({lessons.length})</span>
              </h2>
              {enrollment && (
                <Link
                  href={`/courses/${course.documentId}/lessons/${lessons[0].documentId}`}
                  className="mb-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                >
                  Start learning →
                </Link>
              )}
              <ol className="space-y-2">
                {lessons.map((lesson, i) => {
                  const disabled = !enrollment && !isStaff;
                  return (
                    <li key={lesson.documentId}>
                      {disabled ? (
                        <div className="flex cursor-not-allowed items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 opacity-60">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400">
                            {i + 1}
                          </span>
                          <span className="text-sm text-zinc-300">{lesson.title}</span>
                          <span className="ml-auto text-xs text-zinc-500">Enroll to view</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition hover:border-zinc-700">
                          <div
                            className="flex flex-1 cursor-pointer items-center gap-3"
                            onClick={() =>
                              router.push(
                                `/courses/${course.documentId}/lessons/${lesson.documentId}`
                              )
                            }
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                              {i + 1}
                            </span>
                            <span className="text-sm text-zinc-200">{lesson.title}</span>
                            {isStaff && !enrollment && (
                              <span className="text-xs text-zinc-500">Preview</span>
                            )}
                          </div>
                          {canManage && (
                            <Link
                              href={`/dashboard/courses/${course.documentId}/lessons/${lesson.documentId}/edit`}
                              className="ml-auto text-xs text-zinc-500 hover:text-blue-400"
                            >
                              Edit
                            </Link>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {quizzes.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold text-white">Quizzes</h2>
              <div className="space-y-2">
                {quizzes.map((quiz) => (
                  <Card key={quiz.documentId} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm text-zinc-200">{quiz.title}</span>
                    <div className="flex items-center gap-3">
                      {enrollment ? (
                        <Link
                          href={`/quiz/${quiz.documentId}`}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500"
                        >
                          Take quiz
                        </Link>
                      ) : canPreviewQuiz ? (
                        <Link
                          href={`/quiz/${quiz.documentId}`}
                          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500"
                        >
                          Preview
                        </Link>
                      ) : isStaff ? (
                        <span />
                      ) : (
                        <span className="text-xs text-zinc-500">Enroll to take</span>
                      )}
                      {canManage && (
                        <Link
                          href={`/dashboard/courses/${course.documentId}/quizzes/${quiz.documentId}/edit`}
                          className="text-xs text-zinc-500 hover:text-blue-400"
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:h-fit">
          <Card className="p-6">
            <h1 className="text-2xl font-bold text-white">{course.title}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
              {quizzes.length > 0 && ` · ${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''}`}
            </p>

            {course.instructor && (
              <p className="mt-3 text-sm text-zinc-400">
                Instructor:{' '}
                <span className="font-medium text-zinc-200">
                  {course.instructor.username}
                  {roleLabel(course.instructor.role?.type || '') !== 'Student' && (
                    <span className="ml-1 text-xs text-zinc-500">
                      ({roleLabel(course.instructor.role?.type || '')})
                    </span>
                  )}
                </span>
              </p>
            )}

            <div className="mt-6">
              {enrollment ? (
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600/15 px-3 py-1 text-sm font-medium text-emerald-400">
                    ● Enrolled
                  </span>
                  <p className="mt-2 text-xs text-zinc-500">
                    Enrolled {formatDate(enrollment.enrolledAt)}
                  </p>
                  <Link
                    href="/my-courses"
                    className="mt-4 block text-center rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500"
                  >
                    Go to My Courses
                  </Link>
                </div>
              ) : !user ? (
                <div>
                  <Button onClick={() => router.push('/login')} className="w-full">
                    Log in to enroll
                  </Button>
                  <p className="mt-2 text-center text-xs text-zinc-500">
                    New here?{' '}
                    <Link href="/register" className="text-blue-500">
                      Create an account
                    </Link>
                  </p>
                </div>
              ) : (
                <div>
                  {hasRole('student') ? (
                    <>
                      <Button onClick={handleEnroll} disabled={enrolling} className="w-full">
                        {enrolling ? 'Enrolling...' : 'Enroll in this course'}
                      </Button>
                      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
                    </>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Course content is managed through the content tools.
                    </p>
                  )}
                </div>
              )}
            </div>

            {(ownCourse || hasRole('admin', 'content_manager')) && (
              <div className="mt-6 border-t border-zinc-800 pt-4">
                <Link
                  href={`/dashboard/courses/${course.documentId}/edit`}
                  className="text-sm font-medium text-blue-500 hover:text-blue-400"
                >
                  Manage course →
                </Link>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}