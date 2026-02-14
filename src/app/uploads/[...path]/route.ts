import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), '..', 'aiminv1', 'uploads');
}

export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } }
) {
  const filePath = params.path.join('/');

  // Prevent directory traversal
  if (filePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const fullPath = path.join(getUploadsDir(), filePath);

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ext = path.extname(fullPath).slice(1).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const fileBuffer = fs.readFileSync(fullPath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=604800, immutable',
    },
  });
}
