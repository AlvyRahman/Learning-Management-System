let slowRequests = 0;
const listeners = new Set<(waking: boolean) => void>();

function emit() {
  const waking = slowRequests > 0;
  listeners.forEach((listener) => listener(waking));
}

export function signalSlowStart() {
  slowRequests += 1;
  if (slowRequests === 1) emit();
}

export function signalSlowEnd(success: boolean) {
  if (!success) return;
  slowRequests = Math.max(0, slowRequests - 1);
  if (slowRequests === 0) emit();
}

export function subscribe(listener: (waking: boolean) => void): () => void {
  listeners.add(listener);
  listener(slowRequests > 0);
  return () => {
    listeners.delete(listener);
  };
}