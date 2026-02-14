import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import pool from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_NAME = 'admin191_token';

export interface AdminPayload {
  adm_id: number;
  adm_username: string;
  adm_name: string;
}

export function signAdminToken(payload: AdminPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminPayload;
  } catch {
    return null;
  }
}

export function getAdminFromCookies(): AdminPayload | null {
  const cookieStore = cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function verifyAdmin(username: string, password: string): Promise<AdminPayload | null> {
  const [rows] = await pool.execute(
    'SELECT adm_id, adm_username, adm_password, adm_name FROM admins WHERE adm_username = ?',
    [username]
  );
  const admins = rows as any[];
  if (admins.length === 0) return null;
  const admin = admins[0];
  const valid = bcrypt.compareSync(password, admin.adm_password);
  if (!valid) return null;
  return { adm_id: admin.adm_id, adm_username: admin.adm_username, adm_name: admin.adm_name };
}
