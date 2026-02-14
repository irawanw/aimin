import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const API_KEY = process.env.API_KEY || 'aimin_sk_7f8d9e2a1b4c6d8e0f2a4b6c8d0e2f4a';

/**
 * Validate Bearer token from Authorization header.
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export function authenticate(): NextResponse | null {
  const headersList = headers();
  const authHeader = headersList.get('authorization') || '';

  const match = authHeader.match(/Bearer\s+(.+)/i);
  if (match && match[1] === API_KEY) {
    return null; // authenticated
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Set CORS headers on a response
 */
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

/**
 * JSON response helper matching aiminv1 format
 */
export function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}
