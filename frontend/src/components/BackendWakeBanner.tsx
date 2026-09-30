'use client';

import { useEffect, useState } from 'react';
import { subscribe } from '@/lib/backendStatus';

export default function BackendWakeBanner() {
  const [waking, setWaking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => subscribe(setWaking), []);

  useEffect(() => {
    if (waking) setDismissed(false);
  }, [waking]);

  if (!waking || dismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2">
      <div className="rounded-xl border border-blue-500/70 bg-blue-950/95 px-5 py-4 shadow-2xl shadow-blue-900/50 ring-1 ring-blue-500/30">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-blue-400" />
          <div className="min-w-0">
            <p className="text-base font-bold text-white">Backend is waking up…</p>
            <p className="mt-1 text-sm leading-relaxed text-blue-100/80">
              The preview server (free Render tier) sleeps when idle and can take up to a minute to
              respond. Your request is still in progress — please wait, no need to refresh.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="ml-auto shrink-0 rounded-md px-1 text-zinc-300 transition hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}