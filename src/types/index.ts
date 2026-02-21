export type Role = 'user' | 'admin';
export type Plan = 'lite' | 'pro';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  plan: Plan;
  createdAt: string;
  suspended?: boolean;
  storeJid?: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: Role;
  plan: Plan;
  storeJid?: string;
}

export interface ChatFile {
  url: string;
  type: 'image' | 'video' | 'document';
  filename: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  files?: ChatFile[];
}

export type Locale = 'id' | 'en';
