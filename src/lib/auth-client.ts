import type { User } from '@/types';

const BASE = '/api/auth';

export async function login(email: string, password: string): Promise<{ user: User } | { error: string }> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function register(email: string, name: string, password: string): Promise<{ user: User } | { error: string }> {
  const res = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  });
  return res.json();
}

export async function getMe(): Promise<{ user: User } | { error: string }> {
  const res = await fetch(`${BASE}/me`);
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/logout`, { method: 'POST' });
}
