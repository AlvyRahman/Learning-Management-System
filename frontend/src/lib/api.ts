function normalizeUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return 'http://localhost:1337';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const API_URL = normalizeUrl(process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337');

import type { StrapiUser } from './types';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lms_token');
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('lms_token', token);
  else localStorage.removeItem('lms_token');
}

export function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface StrapiErrorBody {
  error?: {
    message?: string;
    details?: {
      errors?: { message?: string }[];
    };
  };
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const errBody = (body ?? null) as StrapiErrorBody | null;
    const message =
      errBody?.error?.message ||
      errBody?.error?.details?.errors?.map((e) => e.message).join(', ') ||
      `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

async function requestData<T>(path: string, options: RequestInit = {}): Promise<StrapiResponse<T>> {
  return request<StrapiResponse<T>>(path, options);
}

export async function apiGet<T>(path: string, params?: Record<string, string>): Promise<StrapiResponse<T>> {
  const query = params ? `?${new URLSearchParams(params)}` : '';
  return requestData<T>(`${path}${query}`);
}

export async function apiPost<T>(path: string, body: unknown): Promise<StrapiResponse<T>> {
  return requestData<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export async function apiPut<T>(path: string, body: unknown): Promise<StrapiResponse<T>> {
  return requestData<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export async function apiDelete<T>(path: string): Promise<StrapiResponse<T>> {
  return requestData<T>(path, { method: 'DELETE' });
}

export async function apiGetRaw<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? `?${new URLSearchParams(params)}` : '';
  return request<T>(`${path}${query}`);
}

export async function loginUser(identifier: string, password: string) {
  const res = await request<{ jwt: string; user: unknown }>('/auth/local', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  setToken(res.jwt);
  return res.user;
}

export async function registerUser(username: string, email: string, password: string) {
  const res = await request<{ jwt: string; user: unknown }>('/auth/local/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  setToken(res.jwt);
  return res.user;
}

export async function fetchMe() {
  return request<StrapiUser>('/users/me');
}