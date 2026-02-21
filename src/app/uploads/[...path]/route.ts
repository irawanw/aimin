import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  gif:  'image/gif',
  webp: 'image/webp',
  mp4:  'video/mp4',
};

function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), '..', 'aiminv1', 'uploads');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePath = (await params).path.join('/');

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
  const fileSize = stat.size;

  // ── Video: support HTTP range requests for streaming/seeking ──
  if (ext === 'mp4') {
    const range = request.headers.get('range');

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end   = endStr ? parseInt(endStr, 10) : Math.min(start + 10 * 1024 * 1024 - 1, fileSize - 1);
      const chunkSize = end - start + 1;

      const stream   = fs.createReadStream(fullPath, { start, end });
      const readable = new ReadableStream({
        start(controller) {
          stream.on('data',  (chunk) => controller.enqueue(chunk));
          stream.on('end',   ()      => controller.close());
          stream.on('error', (err)   => controller.error(err));
        },
        cancel() { stream.destroy(); },
      });

      return new NextResponse(readable, {
        status: 206,
        headers: {
          'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges':  'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type':   contentType,
          'Cache-Control':  'public, max-age=3600',
        },
      });
    }

    // Full video stream (no range header)
    const stream   = fs.createReadStream(fullPath);
    const readable = new ReadableStream({
      start(controller) {
        stream.on('data',  (chunk) => controller.enqueue(chunk));
        stream.on('end',   ()      => controller.close());
        stream.on('error', (err)   => controller.error(err));
      },
      cancel() { stream.destroy(); },
    });

    return new NextResponse(readable, {
      status: 200,
      headers: {
        'Content-Type':   contentType,
        'Content-Length': String(fileSize),
        'Accept-Ranges':  'bytes',
        'Cache-Control':  'public, max-age=3600',
      },
    });
  }

  // ── Images: read fully into buffer ───────────────────────────
  const fileBuffer = fs.readFileSync(fullPath);
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type':   contentType,
      'Content-Length': String(fileSize),
      'Cache-Control':  'public, max-age=604800, immutable',
    },
  });
}
