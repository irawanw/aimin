import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const SCRAPER_TOKEN = process.env.SCRAPER_TOKEN || '';

// Ensure table exists (runs once per process startup)
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS scrape_jobs (
      id          VARCHAR(36)  PRIMARY KEY,
      platform    VARCHAR(50)  NOT NULL,
      target      VARCHAR(255) NOT NULL,
      status      ENUM('pending','processing','done','error','timeout') DEFAULT 'pending',
      result      MEDIUMTEXT,
      error_msg   VARCHAR(500),
      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status  (status),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tableReady = true;
}

function cors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Headers': 'Content-Type' } }));
}

// GET — extension polls this to pick up a job
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const isPing = req.nextUrl.searchParams.get('ping') === '1';

  if (!SCRAPER_TOKEN || token !== SCRAPER_TOKEN) {
    return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  // Ping — just confirm connection, don't dequeue
  if (isPing) {
    return cors(NextResponse.json({ ok: true }));
  }

  await ensureTable();

  // Expire stale processing jobs (stuck > 3 min)
  await pool.execute(
    `UPDATE scrape_jobs SET status='timeout'
     WHERE status='processing' AND updated_at < DATE_SUB(NOW(), INTERVAL 3 MINUTE)`
  );

  // Atomically claim the oldest pending job
  const [rows] = await pool.execute(
    `SELECT id, platform, target FROM scrape_jobs
     WHERE status='pending'
     ORDER BY created_at ASC
     LIMIT 1`
  ) as any[];

  if (!rows.length) {
    return cors(NextResponse.json({ id: null }));
  }

  const job = rows[0];
  await pool.execute(
    `UPDATE scrape_jobs SET status='processing' WHERE id=?`,
    [job.id]
  );

  return cors(NextResponse.json({ id: job.id, platform: job.platform, target: job.target }));
}
