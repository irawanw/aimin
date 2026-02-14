import pool from '@/lib/db';
import { authenticate, jsonResponse, corsHeaders } from '@/lib/api-auth';
import { NextResponse } from 'next/server';

/**
 * Generic CRUD handler matching aiminv1 Api class behavior.
 * Produces identical JSON responses.
 */
export class ApiHandler {
  constructor(
    private table: string,
    private fillable: string[],
    private primaryKey: string = 'id'
  ) {}

  async getAll(where?: Record<string, any>, orderBy?: string) {
    let sql = `SELECT * FROM ${this.table}`;
    const params: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([key]) => {
        return `${key} = ?`;
      });
      params.push(...Object.values(where));
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  async getOne(value: string, field?: string) {
    const col = field || this.primaryKey;
    const [rows] = await pool.execute(
      `SELECT * FROM ${this.table} WHERE ${col} = ?`,
      [value]
    );
    const data = rows as any[];
    return data.length > 0 ? data[0] : null;
  }

  async create(data: Record<string, any>) {
    const cols: string[] = [];
    const vals: any[] = [];
    const placeholders: string[] = [];

    for (const f of this.fillable) {
      if (data[f] !== undefined) {
        cols.push(f);
        vals.push(data[f]);
        placeholders.push('?');
      }
    }

    if (cols.length === 0) {
      return { error: 'No valid fields provided' };
    }

    const [result] = await pool.execute(
      `INSERT INTO ${this.table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`,
      vals
    ) as any;

    return { success: true, id: result.insertId };
  }

  async update(id: string, data: Record<string, any>, field?: string) {
    const col = field || this.primaryKey;
    const sets: string[] = [];
    const vals: any[] = [];

    for (const f of this.fillable) {
      if (data[f] !== undefined) {
        sets.push(`${f} = ?`);
        vals.push(data[f]);
      }
    }

    if (sets.length === 0) {
      return { error: 'No valid fields to update' };
    }

    vals.push(id);
    const [result] = await pool.execute(
      `UPDATE ${this.table} SET ${sets.join(', ')} WHERE ${col} = ?`,
      vals
    ) as any;

    return { success: true, affected: result.affectedRows };
  }

  async delete(id: string, field?: string) {
    const col = field || this.primaryKey;
    const [result] = await pool.execute(
      `DELETE FROM ${this.table} WHERE ${col} = ?`,
      [id]
    ) as any;

    return { success: true, affected: result.affectedRows };
  }

  /**
   * Build standard REST handlers for a Next.js route.
   * Returns { GET, POST, PUT, DELETE, OPTIONS } exports.
   */
  buildHandlers(identifierParam: string, identifierField?: string) {
    const field = identifierField || this.primaryKey;
    const handler = this;

    return {
      async OPTIONS() {
        return new NextResponse(null, { status: 204, headers: corsHeaders() });
      },

      GET: async (req: Request) => {
        const authErr = authenticate();
        if (authErr) return authErr;

        try {
          const url = new URL(req.url);
          const identifier = url.searchParams.get(identifierParam);

          if (identifier) {
            const result = await handler.getOne(identifier, field);
            return result
              ? jsonResponse(result)
              : jsonResponse({ error: 'Not found' }, 404);
          } else {
            const rows = await handler.getAll();
            return jsonResponse(rows);
          }
        } catch (e: any) {
          return jsonResponse({ error: e.message }, 500);
        }
      },

      POST: async (req: Request) => {
        const authErr = authenticate();
        if (authErr) return authErr;

        try {
          const data = await req.json();
          const result = await handler.create(data);
          return jsonResponse(result, result.error ? 400 : 201);
        } catch (e: any) {
          return jsonResponse({ error: e.message }, 500);
        }
      },

      PUT: async (req: Request) => {
        const authErr = authenticate();
        if (authErr) return authErr;

        try {
          const url = new URL(req.url);
          const identifier = url.searchParams.get(identifierParam);
          if (!identifier) {
            return jsonResponse({ error: 'Identifier required' }, 400);
          }
          const data = await req.json();
          const result = await handler.update(identifier, data, field);
          return jsonResponse(result, result.error ? 400 : 200);
        } catch (e: any) {
          return jsonResponse({ error: e.message }, 500);
        }
      },

      DELETE: async (req: Request) => {
        const authErr = authenticate();
        if (authErr) return authErr;

        try {
          const url = new URL(req.url);
          const identifier = url.searchParams.get(identifierParam);
          if (!identifier) {
            return jsonResponse({ error: 'Identifier required' }, 400);
          }
          const result = await handler.delete(identifier, field);
          return jsonResponse(result);
        } catch (e: any) {
          return jsonResponse({ error: e.message }, 500);
        }
      },
    };
  }
}
