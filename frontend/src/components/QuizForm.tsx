'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPut, apiPost, apiDelete, errorMessage } from '@/lib/api';
import { Quiz, Question } from '@/lib/types';
import { Button, Input, Card } from '@/components/ui';

interface DraftQuestion {
  documentId?: string;
  text: string;
  options: string[];
  correctIndex: number;
  _deleted?: boolean;
}

export default function QuizForm({
  courseId,
  quizId,
}: {
  courseId: string;
  quizId?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(quizId);

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!quizId) return;
    try {
      const [quizRes, questionsRes] = await Promise.all([
        apiGet<Quiz>('/quizzes/' + quizId, { populate: 'course' }),
        apiGet<Question[]>('/questions', {
          'filters[quiz][documentId][$eq]': quizId,
          'pagination[pageSize]': '100',
          sort: 'id',
        }),
      ]);
      setTitle(quizRes.data.title || '');
      setQuestions(
        questionsRes.data.map((q) => ({
          documentId: q.documentId,
          text: q.text,
          options: Array.isArray(q.options) ? [...q.options] : [],
          correctIndex: q.correctIndex ?? 0,
        }))
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateQuestion = (qi: number, patch: Partial<DraftQuestion>) =>
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, ...patch } : q)));

  const updateOption = (qi: number, oi: number, value: string) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q
      )
    );

  const addOption = (qi: number) =>
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, options: [...q.options, ''] } : q)));

  const removeOption = (qi: number, oi: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qi) return q;
        const options = q.options.filter((_, j) => j !== oi);
        return { ...q, options, correctIndex: Math.min(q.correctIndex, options.length - 1) };
      })
    );

  const addQuestion = () => setQuestions((prev) => [...prev, { text: '', options: ['', ''], correctIndex: 0 }]);

  const removeQuestion = (qi: number) =>
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, _deleted: true } : q)));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const invalid = questions.filter(
        (q) => !q._deleted && (!q.text.trim() || q.options.length < 2 || q.options.some((o) => !o.trim()))
      );
      if (invalid.length > 0) {
        setError('Every question needs a prompt and at least two non-empty options.');
        setSaving(false);
        return;
      }

      let targetQuizId: string;
      if (isEdit) {
        await apiPut('/quizzes/' + quizId, { data: { title } });
        targetQuizId = quizId!;
      } else {
        const res = await apiPost<Quiz>('/quizzes', { data: { title, course: courseId } });
        targetQuizId = res.data.documentId;
      }

      for (const q of questions) {
        if (q._deleted) {
          if (q.documentId) await apiDelete('/questions/' + q.documentId);
        } else if (q.documentId) {
          await apiPut('/questions/' + q.documentId, {
            data: { text: q.text, options: q.options, correctIndex: q.correctIndex },
          });
        } else {
          await apiPost('/questions', {
            data: { text: q.text, options: q.options, correctIndex: q.correctIndex, quiz: targetQuizId },
          });
        }
      }
      router.push(`/dashboard/courses/${courseId}/edit`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <Input label="Quiz title" value={title} onChange={setTitle} />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Questions{' '}
          <span className="text-sm font-normal text-zinc-500">
            ({questions.filter((q) => !q._deleted).length})
          </span>
        </h2>
        <Button type="button" variant="secondary" onClick={addQuestion}>
          + Add question
        </Button>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-zinc-500">No questions yet. Add your first question.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {questions.map((q, qi) =>
            q._deleted ? null : (
              <Card key={q.documentId || `new-${qi}`} className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-300">Question {qi + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeQuestion(qi)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <Input
                    label="Prompt"
                    value={q.text}
                    onChange={(val) => updateQuestion(qi, { text: val })}
                  />
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-zinc-300">Options</label>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span className="w-5 text-sm text-zinc-500">
                          {String.fromCharCode(65 + oi)}.
                        </span>
                        <input
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(qi, oi)}
                          disabled={q.options.length <= 2}
                          className="text-sm text-zinc-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(qi)}
                      className="w-fit text-xs text-blue-500 hover:text-blue-400"
                    >
                      + Add option
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-zinc-300">Correct answer</label>
                    <select
                      value={q.correctIndex}
                      onChange={(e) => updateQuestion(qi, { correctIndex: Number(e.target.value) })}
                      className="w-fit rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
                    >
                      {q.options.map((opt, oi) => (
                        <option key={oi} value={oi}>
                          {String.fromCharCode(65 + oi)} — {opt || `Option ${oi + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>
            )
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-800/50 bg-red-600/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save quiz' : 'Create quiz'}
        </Button>
        <Link
          href={`/dashboard/courses/${courseId}/edit`}
          className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}