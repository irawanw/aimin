import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import type { JWTPayload, User, Role, Plan } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_NAME = 'aimin_token';

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromCookies(): string | null {
  const cookieStore = cookies();
  return cookieStore.get(TOKEN_NAME)?.value ?? null;
}

export function getCurrentUser(): JWTPayload | null {
  const token = getTokenFromCookies();
  if (!token) return null;
  return verifyToken(token);
}

// In-memory user store (replace with DB in production)
const users: (User & { passwordHash: string })[] = [
  {
    id: '1',
    email: 'admin@aiminassist.com',
    name: 'Admin',
    role: 'admin',
    plan: 'pro',
    createdAt: new Date().toISOString(),
    passwordHash: bcrypt.hashSync('admin123', 10),
  },
  {
    id: '2',
    email: 'user@aiminassist.com',
    name: 'Demo User',
    role: 'user',
    plan: 'lite',
    createdAt: new Date().toISOString(),
    passwordHash: bcrypt.hashSync('user123', 10),
    storeJid: '73680902189292@s.whatsapp.net',
  },
];

let nextId = 3;

export function findUserByEmail(email: string) {
  return users.find((u) => u.email === email) ?? null;
}

export function createUser(email: string, name: string, password: string, role: Role = 'user', plan: Plan = 'lite') {
  const existing = findUserByEmail(email);
  if (existing) return null;
  const user: User & { passwordHash: string } = {
    id: String(nextId++),
    email,
    name,
    role,
    plan,
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(password),
  };
  users.push(user);
  return user;
}

export function getAllUsers(): User[] {
  return users.map(({ passwordHash, ...u }) => u);
}

export function getUserById(id: string) {
  return users.find((u) => u.id === id) ?? null;
}

export function updateUser(id: string, data: Partial<Pick<User, 'plan' | 'suspended' | 'role'>>) {
  const user = users.find((u) => u.id === id);
  if (!user) return null;
  Object.assign(user, data);
  return user;
}

export function deleteUser(id: string) {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  return true;
}
