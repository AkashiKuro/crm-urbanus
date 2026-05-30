// Camada de dados unica do CRM.
//
// Detecta automaticamente o backend:
//   - Se houver POSTGRES_URL / DATABASE_URL no ambiente  -> usa Postgres (Supabase)
//   - Caso contrario                                     -> usa SQLite local (arquivo)
//
// Assim o mesmo codigo roda local (SQLite, zero config) e na Vercel (Supabase).

export const VALID_STATUS = ["new", "open", "in_progress", "open_deal"];
export const VALID_TAG = ["in_process", "dead", "recycled"];

const PG_URL =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  "";

export const usingPostgres = Boolean(PG_URL);

const SEED = [
  ["Andrew Peterson", "603 555-0123", "andrew@example.com", "website", "new", "in_process"],
  ["Ralph Edwards", "217 555-0113", "tanya.hill@example.com", "indicacao", "new", "dead"],
  ["Kathryn Murphy", "319 555-0115", "tanya.hill@example.com", "website", "new", "recycled"],
  ["Brooklyn Simmons", "239 555-0108", "tim@example.com", "anuncio", "open", "dead"],
  ["Dianne Russell", "308 555-0121", "felicia.reid@example.com", "website", "open", "in_process"],
  ["Arlene McCoy", "209 555-0104", "bill.sanders@example.com", "indicacao", "open", "dead"],
  ["Leslie Alexander", "808 555-0111", "sara.cruz@example.com", "anuncio", "in_progress", "recycled"],
  ["Marvin McKinney", "907 555-0101", "sara.cruz@example.com", "website", "in_progress", "recycled"],
  ["Eleanor Pena", "629 555-0129", "debra.holt@example.com", "website", "in_progress", "in_process"],
  ["Jacob Jones", "684 555-0102", "andrew@example.com", "anuncio", "open_deal", "in_process"],
  ["Darlene Robertson", "405 555-0128", "sara.cruz@example.com", "website", "open_deal", "recycled"],
];

/* ------------------------------------------------------------------ */
/*  Implementacao Postgres (Supabase)                                  */
/* ------------------------------------------------------------------ */

let pgPoolPromise = null;

async function getPg() {
  if (!pgPoolPromise) {
    pgPoolPromise = (async () => {
      const { default: pg } = await import("pg");
      const pool = new pg.Pool({
        connectionString: PG_URL,
        ssl: { rejectUnauthorized: false },
        max: 3,
      });
      await pool.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id          SERIAL PRIMARY KEY,
          name        TEXT NOT NULL,
          phone       TEXT NOT NULL DEFAULT '',
          email       TEXT NOT NULL DEFAULT '',
          source      TEXT NOT NULL DEFAULT 'manual',
          status      TEXT NOT NULL DEFAULT 'new',
          tag         TEXT NOT NULL DEFAULT 'in_process',
          notes       TEXT NOT NULL DEFAULT '',
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM leads");
      if (rows[0].c === 0) {
        for (const s of SEED) {
          await pool.query(
            `INSERT INTO leads (name, phone, email, source, status, tag)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            s
          );
        }
      }
      return pool;
    })();
  }
  return pgPoolPromise;
}

const pgRepo = {
  async list() {
    const pool = await getPg();
    const { rows } = await pool.query(
      "SELECT * FROM leads ORDER BY created_at DESC"
    );
    return rows;
  },
  async create(d) {
    const pool = await getPg();
    const { rows } = await pool.query(
      `INSERT INTO leads (name, phone, email, source, status, tag, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [d.name, d.phone, d.email, d.source, d.status, d.tag, d.notes]
    );
    return rows[0];
  },
  async get(id) {
    const pool = await getPg();
    const { rows } = await pool.query("SELECT * FROM leads WHERE id = $1", [id]);
    return rows[0] || null;
  },
  async update(id, d) {
    const pool = await getPg();
    const { rows } = await pool.query(
      `UPDATE leads SET name=$1, phone=$2, email=$3, source=$4, status=$5,
         tag=$6, notes=$7, updated_at=now() WHERE id=$8 RETURNING *`,
      [d.name, d.phone, d.email, d.source, d.status, d.tag, d.notes, id]
    );
    return rows[0] || null;
  },
  async remove(id) {
    const pool = await getPg();
    const r = await pool.query("DELETE FROM leads WHERE id = $1", [id]);
    return r.rowCount > 0;
  },
  async stats() {
    const pool = await getPg();
    const total = (await pool.query("SELECT COUNT(*)::int AS c FROM leads"))
      .rows[0].c;
    const statusRows = (
      await pool.query("SELECT status, COUNT(*)::int AS c FROM leads GROUP BY status")
    ).rows;
    const tagRows = (
      await pool.query("SELECT tag, COUNT(*)::int AS c FROM leads GROUP BY tag")
    ).rows;
    const recent = (
      await pool.query("SELECT * FROM leads ORDER BY created_at DESC LIMIT 6")
    ).rows;
    return buildStats(total, statusRows, tagRows, recent);
  },
};

/* ------------------------------------------------------------------ */
/*  Implementacao SQLite (local)                                       */
/* ------------------------------------------------------------------ */

let sqliteDb = null;

async function getSqlite() {
  if (!sqliteDb) {
    const { DatabaseSync } = await import("node:sqlite");
    const { mkdirSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const here = dirname(fileURLToPath(import.meta.url));
    const dataDir = join(here, "data");
    mkdirSync(dataDir, { recursive: true });

    sqliteDb = new DatabaseSync(join(dataDir, "crm.db"));
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        source TEXT DEFAULT 'manual',
        status TEXT NOT NULL DEFAULT 'new',
        tag TEXT NOT NULL DEFAULT 'in_process',
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    const c = sqliteDb.prepare("SELECT COUNT(*) AS c FROM leads").get().c;
    if (c === 0) {
      const ins = sqliteDb.prepare(
        `INSERT INTO leads (name, phone, email, source, status, tag)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const s of SEED) ins.run(...s);
    }
  }
  return sqliteDb;
}

const sqliteRepo = {
  async list() {
    const db = await getSqlite();
    return db
      .prepare("SELECT * FROM leads ORDER BY datetime(created_at) DESC")
      .all();
  },
  async create(d) {
    const db = await getSqlite();
    const info = db
      .prepare(
        `INSERT INTO leads (name, phone, email, source, status, tag, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(d.name, d.phone, d.email, d.source, d.status, d.tag, d.notes);
    return db
      .prepare("SELECT * FROM leads WHERE id = ?")
      .get(info.lastInsertRowid);
  },
  async get(id) {
    const db = await getSqlite();
    return db.prepare("SELECT * FROM leads WHERE id = ?").get(id) || null;
  },
  async update(id, d) {
    const db = await getSqlite();
    db.prepare(
      `UPDATE leads SET name=?, phone=?, email=?, source=?, status=?, tag=?,
         notes=?, updated_at = datetime('now') WHERE id = ?`
    ).run(d.name, d.phone, d.email, d.source, d.status, d.tag, d.notes, id);
    return db.prepare("SELECT * FROM leads WHERE id = ?").get(id) || null;
  },
  async remove(id) {
    const db = await getSqlite();
    return db.prepare("DELETE FROM leads WHERE id = ?").run(id).changes > 0;
  },
  async stats() {
    const db = await getSqlite();
    const total = db.prepare("SELECT COUNT(*) AS c FROM leads").get().c;
    const statusRows = db
      .prepare("SELECT status, COUNT(*) AS c FROM leads GROUP BY status")
      .all();
    const tagRows = db
      .prepare("SELECT tag, COUNT(*) AS c FROM leads GROUP BY tag")
      .all();
    const recent = db
      .prepare("SELECT * FROM leads ORDER BY datetime(created_at) DESC LIMIT 6")
      .all();
    return buildStats(total, statusRows, tagRows, recent);
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers compartilhados                                             */
/* ------------------------------------------------------------------ */

function buildStats(total, statusRows, tagRows, recent) {
  const byStatus = {};
  for (const r of statusRows) byStatus[r.status] = r.c;
  const byTag = {};
  for (const r of tagRows) byTag[r.tag] = r.c;
  return { total, byStatus, byTag, recent };
}

// Normaliza/valida os campos vindos do cliente, aplicando defaults.
export function normalizeLead(body, existing = null) {
  const b = body || {};
  const pick = (v, fallback) => (v === undefined || v === null ? fallback : v);
  return {
    name: pick(b.name, existing?.name ?? "").toString().trim(),
    phone: pick(b.phone, existing?.phone ?? ""),
    email: pick(b.email, existing?.email ?? ""),
    source: pick(b.source, existing?.source ?? "manual"),
    status: VALID_STATUS.includes(b.status)
      ? b.status
      : existing?.status ?? "new",
    tag: VALID_TAG.includes(b.tag) ? b.tag : existing?.tag ?? "in_process",
    notes: pick(b.notes, existing?.notes ?? ""),
  };
}

export const repo = usingPostgres ? pgRepo : sqliteRepo;
