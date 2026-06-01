// Camada de dados unica do CRM.
//
// Detecta automaticamente o backend:
//   - Se houver POSTGRES_URL / DATABASE_URL no ambiente  -> usa Postgres (Supabase)
//   - Caso contrario                                     -> usa SQLite local (arquivo)
//
// Conceitos (estilo RD Station):
//   - stage  = etapa do funil (coluna)       -> ver VALID_STAGE
//   - status = situacao da negociacao         -> em_andamento | vendido | perdido | pausado
//   - owner_id = vendedor responsavel pelo lead
// Usuarios: role = admin | seller. Admin ve tudo; seller ve so os seus leads.

import { hashPassword } from "./auth.js";

export const VALID_STAGE = [
  "sem_contato",
  "tentando_contato",
  "identificacao",
  "negociacao",
  "proposta_enviada",
  "fechamento",
];

export const VALID_STATUS = ["em_andamento", "vendido", "perdido", "pausado"];
export const VALID_ROLE = ["admin", "seller"];

const PG_URL =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  "";

export const usingPostgres = Boolean(PG_URL);

// Usuarios iniciais (senhas hex via scrypt no seed)
const SEED_USERS = [
  { name: "Administrador", email: "admin@urbanus.com", password: "admin123", role: "admin" },
  { name: "Vendedor Demo", email: "vendedor@urbanus.com", password: "vendedor123", role: "seller" },
];

// [name, phone, email, source, stage, model, payment, value, rating]
const SEED_LEADS = [
  ["Thayane Santos Costa", "11 98888-0001", "thayane@example.com", "haojuemotos.com.br", "sem_contato", "Master Ride 150", "Financiamento", 18900, 1],
  ["Erick", "11 98888-0002", "erick@example.com", "site", "sem_contato", "", "", 0, 1],
  ["Baldoino Tiburtino", "11 98888-0003", "baldoino@example.com", "indicacao", "tentando_contato", "Master Ride 150", "A vista", 18900, 1],
  ["Anderson", "11 98888-0004", "anderson@example.com", "anuncio", "tentando_contato", "DK 150", "Financiamento", 16500, 2],
  ["Claudio Menezes de Morais", "11 98888-0005", "claudio@example.com", "site", "tentando_contato", "", "", 0, 1],
  ["Silvia", "11 98888-0006", "silvia@example.com", "Master Ride", "negociacao", "Master Ride 150", "Consórcio", 18900, 3],
  ["Elias Gomes Batista", "11 98888-0007", "elias@example.com", "indicacao", "negociacao", "DK 150", "Financiamento", 16500, 2],
  ["Jeane Lima", "11 98888-0008", "jeane@example.com", "site", "negociacao", "Master Ride 150", "A vista", 18900, 2],
];

/* ================================================================== */
/*  POSTGRES                                                            */
/* ================================================================== */

let pgPoolPromise = null;

async function getPg() {
  if (!pgPoolPromise) {
    pgPoolPromise = (async () => {
      const { default: pg } = await import("pg");
      // Remove o parametro sslmode da connection string. O Supabase usa
      // certificado autoassinado; se "sslmode=require" ficar na URL, o driver pg
      // sobrescreve a nossa config e volta a validar o certificado (erro
      // "self-signed certificate in certificate chain"). Tirando o sslmode, o
      // nosso ssl.rejectUnauthorized:false abaixo passa a valer.
      let connStr = PG_URL;
      try {
        const u = new URL(PG_URL);
        u.searchParams.delete("sslmode");
        connStr = u.toString();
      } catch {
        connStr = PG_URL.replace(/([?&])sslmode=[^&]*(&|$)/i, "$1").replace(/[?&]$/, "");
      }
      const pool = new pg.Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        max: 3,
      });
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id          SERIAL PRIMARY KEY,
          name        TEXT NOT NULL,
          email       TEXT NOT NULL UNIQUE,
          password    TEXT NOT NULL,
          role        TEXT NOT NULL DEFAULT 'seller',
          active      BOOLEAN NOT NULL DEFAULT true,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS leads (
          id          SERIAL PRIMARY KEY,
          name        TEXT NOT NULL,
          phone       TEXT NOT NULL DEFAULT '',
          email       TEXT NOT NULL DEFAULT '',
          source      TEXT NOT NULL DEFAULT 'manual',
          stage       TEXT NOT NULL DEFAULT 'sem_contato',
          status      TEXT NOT NULL DEFAULT 'em_andamento',
          model       TEXT NOT NULL DEFAULT '',
          payment     TEXT NOT NULL DEFAULT '',
          value       NUMERIC NOT NULL DEFAULT 0,
          rating      INTEGER NOT NULL DEFAULT 1,
          notes       TEXT NOT NULL DEFAULT '',
          loss_reason TEXT NOT NULL DEFAULT '',
          owner_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
          closed_at   TIMESTAMPTZ,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS tasks (
          id          SERIAL PRIMARY KEY,
          title       TEXT NOT NULL,
          due_date    DATE NOT NULL,
          done        BOOLEAN NOT NULL DEFAULT false,
          lead_id     INTEGER REFERENCES leads(id) ON DELETE SET NULL,
          owner_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
          notes       TEXT NOT NULL DEFAULT '',
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS interactions (
          id          SERIAL PRIMARY KEY,
          lead_id     INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          user_id     INTEGER,
          kind        TEXT NOT NULL DEFAULT 'note',
          content     TEXT NOT NULL DEFAULT '',
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      // seed users
      const u = await pool.query("SELECT COUNT(*)::int AS c FROM users");
      let ownerIds = [];
      if (u.rows[0].c === 0) {
        for (const su of SEED_USERS) {
          const r = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id",
            [su.name, su.email, hashPassword(su.password), su.role]
          );
          ownerIds.push(r.rows[0].id);
        }
      } else {
        ownerIds = (await pool.query("SELECT id FROM users ORDER BY id")).rows.map((r) => r.id);
      }
      // seed leads (atribui ao vendedor demo, 2o usuario, ou ao 1o)
      const l = await pool.query("SELECT COUNT(*)::int AS c FROM leads");
      if (l.rows[0].c === 0) {
        const owner = ownerIds[1] || ownerIds[0] || null;
        for (const s of SEED_LEADS) {
          await pool.query(
            `INSERT INTO leads (name, phone, email, source, stage, model, payment, value, rating, owner_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [...s, owner]
          );
        }
      }
      return pool;
    })();
  }
  return pgPoolPromise;
}

const LEAD_SELECT =
  "SELECT l.*, u.name AS owner_name FROM leads l LEFT JOIN users u ON u.id = l.owner_id";

const pgRepo = {
  async list({ status, ownerId } = {}) {
    const pool = await getPg();
    const where = [];
    const params = [];
    if (status) {
      params.push(status);
      where.push(`l.status = $${params.length}`);
    }
    if (ownerId != null) {
      params.push(ownerId);
      where.push(`l.owner_id = $${params.length}`);
    }
    const sql =
      LEAD_SELECT +
      (where.length ? " WHERE " + where.join(" AND ") : "") +
      " ORDER BY l.created_at DESC";
    const { rows } = await pool.query(sql, params);
    return rows.map(normalizeLeadRow);
  },
  async create(d) {
    const pool = await getPg();
    const { rows } = await pool.query(
      `INSERT INTO leads (name, phone, email, source, stage, status, model, payment, value, rating, notes, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [d.name, d.phone, d.email, d.source, d.stage, d.status, d.model, d.payment, d.value, d.rating, d.notes, d.owner_id]
    );
    return this.get(rows[0].id);
  },
  async get(id) {
    const pool = await getPg();
    const { rows } = await pool.query(LEAD_SELECT + " WHERE l.id = $1", [id]);
    return rows[0] ? normalizeLeadRow(rows[0]) : null;
  },
  async update(id, d) {
    const pool = await getPg();
    await pool.query(
      `UPDATE leads SET name=$1, phone=$2, email=$3, source=$4, stage=$5, status=$6,
         model=$7, payment=$8, value=$9, rating=$10, notes=$11, loss_reason=$12,
         owner_id=$13, closed_at=$14, updated_at=now() WHERE id=$15`,
      [d.name, d.phone, d.email, d.source, d.stage, d.status, d.model, d.payment,
       d.value, d.rating, d.notes, d.loss_reason, d.owner_id, d.closed_at, id]
    );
    return this.get(id);
  },
  async remove(id) {
    const pool = await getPg();
    const r = await pool.query("DELETE FROM leads WHERE id = $1", [id]);
    return r.rowCount > 0;
  },
  async stats({ ownerId, month } = {}) {
    const pool = await getPg();
    return computeStats(async (sql, params) => (await pool.query(sql, params)).rows, true, ownerId, month);
  },

  // ----- users -----
  async listUsers() {
    const pool = await getPg();
    const { rows } = await pool.query(
      "SELECT id, name, email, role, active, created_at FROM users ORDER BY id"
    );
    return rows;
  },
  async getUserByEmail(email) {
    const pool = await getPg();
    const { rows } = await pool.query("SELECT * FROM users WHERE lower(email)=lower($1)", [email]);
    return rows[0] || null;
  },
  async getUser(id) {
    const pool = await getPg();
    const { rows } = await pool.query(
      "SELECT id, name, email, role, active, created_at FROM users WHERE id=$1",
      [id]
    );
    return rows[0] || null;
  },
  async createUser(d) {
    const pool = await getPg();
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id",
      [d.name, d.email, d.password, d.role]
    );
    return this.getUser(rows[0].id);
  },
  async updateUser(id, d) {
    const pool = await getPg();
    const sets = ["name=$1", "email=$2", "role=$3", "active=$4"];
    const params = [d.name, d.email, d.role, d.active];
    if (d.password) {
      params.push(d.password);
      sets.push(`password=$${params.length}`);
    }
    params.push(id);
    await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id=$${params.length}`, params);
    return this.getUser(id);
  },

  // ----- tasks -----
  async listTasks({ ownerId } = {}) {
    const pool = await getPg();
    const params = [];
    let where = "";
    if (ownerId != null) {
      params.push(ownerId);
      where = " WHERE t.owner_id = $1";
    }
    const { rows } = await pool.query(
      `SELECT t.*, l.name AS lead_name FROM tasks t
         LEFT JOIN leads l ON l.id = t.lead_id${where}
        ORDER BY t.done ASC, t.due_date ASC, t.id ASC`,
      params
    );
    return rows.map(normalizeTaskRow);
  },
  async createTask(d) {
    const pool = await getPg();
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, due_date, done, lead_id, owner_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [d.title, d.due_date, !!d.done, d.lead_id, d.owner_id, d.notes]
    );
    return this.getTask(rows[0].id);
  },
  async getTask(id) {
    const pool = await getPg();
    const { rows } = await pool.query(
      `SELECT t.*, l.name AS lead_name FROM tasks t
         LEFT JOIN leads l ON l.id = t.lead_id WHERE t.id = $1`,
      [id]
    );
    return rows[0] ? normalizeTaskRow(rows[0]) : null;
  },
  async updateTask(id, d) {
    const pool = await getPg();
    await pool.query(
      `UPDATE tasks SET title=$1, due_date=$2, done=$3, lead_id=$4, notes=$5 WHERE id=$6`,
      [d.title, d.due_date, !!d.done, d.lead_id, d.notes, id]
    );
    return this.getTask(id);
  },
  async removeTask(id) {
    const pool = await getPg();
    const r = await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
    return r.rowCount > 0;
  },

  // ----- interactions -----
  async listInteractions(leadId) {
    const pool = await getPg();
    const { rows } = await pool.query(
      "SELECT * FROM interactions WHERE lead_id=$1 ORDER BY created_at DESC, id DESC",
      [leadId]
    );
    return rows.map(normalizeInteractionRow);
  },
  async addInteraction(leadId, d) {
    const pool = await getPg();
    const { rows } = await pool.query(
      "INSERT INTO interactions (lead_id, user_id, kind, content) VALUES ($1,$2,$3,$4) RETURNING *",
      [leadId, d.user_id ?? null, d.kind, d.content]
    );
    return normalizeInteractionRow(rows[0]);
  },
};

/* ================================================================== */
/*  SQLITE                                                             */
/* ================================================================== */

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
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'seller',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        source TEXT DEFAULT 'manual',
        stage TEXT NOT NULL DEFAULT 'sem_contato',
        status TEXT NOT NULL DEFAULT 'em_andamento',
        model TEXT DEFAULT '',
        payment TEXT DEFAULT '',
        value REAL NOT NULL DEFAULT 0,
        rating INTEGER NOT NULL DEFAULT 1,
        notes TEXT DEFAULT '',
        loss_reason TEXT DEFAULT '',
        owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        closed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        due_date TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
        owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        user_id INTEGER,
        kind TEXT NOT NULL DEFAULT 'note',
        content TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    // seed users
    const uc = sqliteDb.prepare("SELECT COUNT(*) AS c FROM users").get().c;
    let ownerIds = [];
    if (uc === 0) {
      const ins = sqliteDb.prepare(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
      );
      for (const su of SEED_USERS) {
        const info = ins.run(su.name, su.email, hashPassword(su.password), su.role);
        ownerIds.push(Number(info.lastInsertRowid));
      }
    } else {
      ownerIds = sqliteDb.prepare("SELECT id FROM users ORDER BY id").all().map((r) => r.id);
    }
    // seed leads
    const lc = sqliteDb.prepare("SELECT COUNT(*) AS c FROM leads").get().c;
    if (lc === 0) {
      const owner = ownerIds[1] || ownerIds[0] || null;
      const ins = sqliteDb.prepare(
        `INSERT INTO leads (name, phone, email, source, stage, model, payment, value, rating, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const s of SEED_LEADS) ins.run(...s, owner);
    }
  }
  return sqliteDb;
}

const sqliteRepo = {
  async list({ status, ownerId } = {}) {
    const db = await getSqlite();
    const where = [];
    const params = [];
    if (status) {
      where.push("l.status = ?");
      params.push(status);
    }
    if (ownerId != null) {
      where.push("l.owner_id = ?");
      params.push(ownerId);
    }
    const sql =
      LEAD_SELECT +
      (where.length ? " WHERE " + where.join(" AND ") : "") +
      " ORDER BY datetime(l.created_at) DESC";
    return db.prepare(sql).all(...params).map(normalizeLeadRow);
  },
  async create(d) {
    const db = await getSqlite();
    const info = db
      .prepare(
        `INSERT INTO leads (name, phone, email, source, stage, status, model, payment, value, rating, notes, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(d.name, d.phone, d.email, d.source, d.stage, d.status, d.model, d.payment, d.value, d.rating, d.notes, d.owner_id);
    return this.get(info.lastInsertRowid);
  },
  async get(id) {
    const db = await getSqlite();
    const row = db.prepare(LEAD_SELECT + " WHERE l.id = ?").get(id);
    return row ? normalizeLeadRow(row) : null;
  },
  async update(id, d) {
    const db = await getSqlite();
    db.prepare(
      `UPDATE leads SET name=?, phone=?, email=?, source=?, stage=?, status=?,
         model=?, payment=?, value=?, rating=?, notes=?, loss_reason=?, owner_id=?, closed_at=?,
         updated_at = datetime('now') WHERE id = ?`
    ).run(d.name, d.phone, d.email, d.source, d.stage, d.status, d.model,
      d.payment, d.value, d.rating, d.notes, d.loss_reason, d.owner_id, d.closed_at, id);
    return this.get(id);
  },
  async remove(id) {
    const db = await getSqlite();
    return db.prepare("DELETE FROM leads WHERE id = ?").run(id).changes > 0;
  },
  async stats({ ownerId, month } = {}) {
    const db = await getSqlite();
    return computeStats(async (sql, params = []) => db.prepare(sql).all(...params), false, ownerId, month);
  },

  // ----- users -----
  async listUsers() {
    const db = await getSqlite();
    return db.prepare("SELECT id, name, email, role, active, created_at FROM users ORDER BY id").all();
  },
  async getUserByEmail(email) {
    const db = await getSqlite();
    return db.prepare("SELECT * FROM users WHERE lower(email)=lower(?)").get(email) || null;
  },
  async getUser(id) {
    const db = await getSqlite();
    return db.prepare("SELECT id, name, email, role, active, created_at FROM users WHERE id=?").get(id) || null;
  },
  async createUser(d) {
    const db = await getSqlite();
    const info = db
      .prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)")
      .run(d.name, d.email, d.password, d.role);
    return this.getUser(info.lastInsertRowid);
  },
  async updateUser(id, d) {
    const db = await getSqlite();
    if (d.password) {
      db.prepare("UPDATE users SET name=?, email=?, role=?, active=?, password=? WHERE id=?")
        .run(d.name, d.email, d.role, d.active ? 1 : 0, d.password, id);
    } else {
      db.prepare("UPDATE users SET name=?, email=?, role=?, active=? WHERE id=?")
        .run(d.name, d.email, d.role, d.active ? 1 : 0, id);
    }
    return this.getUser(id);
  },

  // ----- tasks -----
  async listTasks({ ownerId } = {}) {
    const db = await getSqlite();
    const params = [];
    let where = "";
    if (ownerId != null) {
      where = " WHERE t.owner_id = ?";
      params.push(ownerId);
    }
    return db
      .prepare(
        `SELECT t.*, l.name AS lead_name FROM tasks t
           LEFT JOIN leads l ON l.id = t.lead_id${where}
          ORDER BY t.done ASC, t.due_date ASC, t.id ASC`
      )
      .all(...params)
      .map(normalizeTaskRow);
  },
  async createTask(d) {
    const db = await getSqlite();
    const info = db
      .prepare(
        `INSERT INTO tasks (title, due_date, done, lead_id, owner_id, notes) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(d.title, d.due_date, d.done ? 1 : 0, d.lead_id, d.owner_id, d.notes);
    return this.getTask(info.lastInsertRowid);
  },
  async getTask(id) {
    const db = await getSqlite();
    const row = db
      .prepare(
        `SELECT t.*, l.name AS lead_name FROM tasks t
           LEFT JOIN leads l ON l.id = t.lead_id WHERE t.id = ?`
      )
      .get(id);
    return row ? normalizeTaskRow(row) : null;
  },
  async updateTask(id, d) {
    const db = await getSqlite();
    db.prepare(
      `UPDATE tasks SET title=?, due_date=?, done=?, lead_id=?, notes=? WHERE id=?`
    ).run(d.title, d.due_date, d.done ? 1 : 0, d.lead_id, d.notes, id);
    return this.getTask(id);
  },
  async removeTask(id) {
    const db = await getSqlite();
    return db.prepare("DELETE FROM tasks WHERE id = ?").run(id).changes > 0;
  },

  // ----- interactions -----
  async listInteractions(leadId) {
    const db = await getSqlite();
    return db
      .prepare("SELECT * FROM interactions WHERE lead_id=? ORDER BY datetime(created_at) DESC, id DESC")
      .all(leadId)
      .map(normalizeInteractionRow);
  },
  async addInteraction(leadId, d) {
    const db = await getSqlite();
    const info = db
      .prepare("INSERT INTO interactions (lead_id, user_id, kind, content) VALUES (?, ?, ?, ?)")
      .run(leadId, d.user_id ?? null, d.kind, d.content);
    const row = db.prepare("SELECT * FROM interactions WHERE id = ?").get(info.lastInsertRowid);
    return normalizeInteractionRow(row);
  },
};

/* ================================================================== */
/*  Stats                                                              */
/* ================================================================== */

async function computeStats(query, isPg, ownerId, month) {
  const intC = isPg ? "::int" : "";
  const monthExpr = isPg
    ? "to_char(created_at, 'YYYY-MM')"
    : "strftime('%Y-%m', created_at)";
  // mes-alvo das metricas "do mes" (formato YYYY-MM); padrao = mes atual
  const nowMonth = month || new Date().toISOString().slice(0, 7);

  // filtro de dono (opcional)
  const ph = isPg ? "$1" : "?";
  const ownerCond = ownerId != null ? ` owner_id = ${ph} ` : "";
  const andOwner = ownerId != null ? ` AND${ownerCond}` : "";
  const whereOwner = ownerId != null ? ` WHERE${ownerCond}` : "";
  const op = ownerId != null ? [ownerId] : [];

  const total = (await query(`SELECT COUNT(*)${intC} AS c FROM leads${whereOwner}`, op))[0].c;
  const stageRows = await query(
    `SELECT stage, COUNT(*)${intC} AS c FROM leads WHERE status='em_andamento'${andOwner} GROUP BY stage`,
    op
  );
  const statusRows = await query(
    `SELECT status, COUNT(*)${intC} AS c FROM leads${whereOwner} GROUP BY status`,
    op
  );

  // consultas com mes precisam do parametro do mes + (opcional) owner
  const monthPh = isPg ? (ownerId != null ? "$2" : "$1") : "?";
  const monthParams = ownerId != null ? [ownerId, nowMonth] : [nowMonth];

  const leadsThisMonth = (
    await query(`SELECT COUNT(*)${intC} AS c FROM leads WHERE ${monthExpr} = ${monthPh}${andOwner}`, monthParams)
  )[0].c;
  const wonThisMonth = (
    await query(
      `SELECT COUNT(*)${intC} AS c, COALESCE(SUM(value),0) AS v FROM leads
        WHERE status='vendido' AND ${monthExpr} = ${monthPh}${andOwner}`,
      monthParams
    )
  )[0];
  const lostThisMonth = (
    await query(`SELECT COUNT(*)${intC} AS c FROM leads WHERE status='perdido' AND ${monthExpr} = ${monthPh}${andOwner}`, monthParams)
  )[0].c;
  const openValue = (
    await query(`SELECT COALESCE(SUM(value),0) AS v FROM leads WHERE status='em_andamento'${andOwner}`, op)
  )[0].v;
  const recent = (
    await query(LEAD_SELECT + (ownerId != null ? ` WHERE l.owner_id = ${ph}` : "") + " ORDER BY l.created_at DESC LIMIT 6", op)
  ).map(normalizeLeadRow);
  const tasksPending = (
    await query(
      `SELECT COUNT(*)${intC} AS c FROM tasks WHERE done ${isPg ? "= false" : "= 0"}${ownerId != null ? ` AND owner_id = ${ph}` : ""}`,
      op
    )
  )[0].c;
  const monthlyRows = await query(
    `SELECT ${monthExpr} AS m, COUNT(*)${intC} AS c FROM leads${whereOwner} GROUP BY m ORDER BY m`,
    op
  );

  // ranking por vendedor (so faz sentido no modo admin = sem ownerId)
  let perSeller = [];
  if (ownerId == null) {
    perSeller = await query(
      `SELECT u.id, u.name,
              COUNT(l.id)${intC} AS total,
              COALESCE(SUM(CASE WHEN l.status='vendido' THEN 1 ELSE 0 END),0)${intC} AS vendas,
              COALESCE(SUM(CASE WHEN l.status='vendido' THEN l.value ELSE 0 END),0) AS faturado,
              COALESCE(SUM(CASE WHEN l.status='em_andamento' THEN 1 ELSE 0 END),0)${intC} AS abertos
         FROM users u LEFT JOIN leads l ON l.owner_id = u.id
        WHERE u.role = 'seller'
        GROUP BY u.id, u.name ORDER BY faturado DESC`,
      []
    );
  }

  const byStage = {};
  for (const r of stageRows) byStage[r.stage] = r.c;
  const byStatus = {};
  for (const r of statusRows) byStatus[r.status] = r.c;

  const won = Number(wonThisMonth.c) || 0;
  const lost = Number(lostThisMonth) || 0;
  const closed = won + lost;
  const conversion = closed > 0 ? Math.round((won / closed) * 100) : 0;

  return {
    total,
    byStage,
    byStatus,
    leadsThisMonth,
    wonThisMonth: won,
    wonValueThisMonth: Number(wonThisMonth.v) || 0,
    lostThisMonth: lost,
    conversion,
    openValue: Number(openValue) || 0,
    tasksPending,
    monthly: monthlyRows.map((r) => ({ month: r.m, count: r.c })),
    perSeller: perSeller.map((r) => ({
      id: r.id,
      name: r.name,
      total: Number(r.total) || 0,
      vendas: Number(r.vendas) || 0,
      faturado: Number(r.faturado) || 0,
      abertos: Number(r.abertos) || 0,
    })),
    recent,
  };
}

/* ================================================================== */
/*  Normalizadores + validacao                                        */
/* ================================================================== */

function isoDate(v) {
  if (v instanceof Date) return v.toISOString();
  return v ?? null;
}

function normalizeLeadRow(row) {
  return {
    ...row,
    value: Number(row.value) || 0,
    rating: Number(row.rating) || 1,
    loss_reason: row.loss_reason ?? "",
    owner_id: row.owner_id ?? null,
    owner_name: row.owner_name ?? null,
    closed_at: isoDate(row.closed_at),
    created_at: isoDate(row.created_at),
    updated_at: isoDate(row.updated_at),
  };
}

function normalizeTaskRow(row) {
  let due = row.due_date;
  if (due instanceof Date) due = due.toISOString().slice(0, 10);
  else if (typeof due === "string" && due.length > 10) due = due.slice(0, 10);
  return {
    ...row,
    due_date: due,
    done: row.done ? 1 : 0,
    lead_id: row.lead_id ?? null,
    lead_name: row.lead_name ?? null,
    owner_id: row.owner_id ?? null,
    notes: row.notes ?? "",
  };
}

function normalizeInteractionRow(row) {
  return { ...row, created_at: isoDate(row.created_at) };
}

export function normalizeLead(body, existing = null) {
  const b = body || {};
  const pick = (v, fb) => (v === undefined || v === null ? fb : v);
  let rating = Number(pick(b.rating, existing?.rating ?? 1));
  if (!(rating >= 1 && rating <= 5)) rating = existing?.rating ?? 1;
  let value = Number(pick(b.value, existing?.value ?? 0));
  if (!(value >= 0)) value = 0;
  let ownerId = pick(b.owner_id, existing?.owner_id ?? null);
  ownerId = ownerId === null || ownerId === "" ? null : Number(ownerId);
  return {
    name: pick(b.name, existing?.name ?? "").toString().trim(),
    phone: pick(b.phone, existing?.phone ?? ""),
    email: pick(b.email, existing?.email ?? ""),
    source: pick(b.source, existing?.source ?? "manual"),
    stage: VALID_STAGE.includes(b.stage) ? b.stage : existing?.stage ?? "sem_contato",
    status: VALID_STATUS.includes(b.status) ? b.status : existing?.status ?? "em_andamento",
    model: pick(b.model, existing?.model ?? ""),
    payment: pick(b.payment, existing?.payment ?? ""),
    value,
    rating,
    notes: pick(b.notes, existing?.notes ?? ""),
    loss_reason: pick(b.loss_reason, existing?.loss_reason ?? ""),
    owner_id: ownerId,
    closed_at: pick(b.closed_at, existing?.closed_at ?? null),
  };
}

export function normalizeTask(body, existing = null) {
  const b = body || {};
  const pick = (v, fb) => (v === undefined || v === null ? fb : v);
  let leadId = pick(b.lead_id, existing?.lead_id ?? null);
  leadId = leadId === null || leadId === "" || leadId === undefined ? null : Number(leadId);
  return {
    title: pick(b.title, existing?.title ?? "").toString().trim(),
    due_date: pick(b.due_date, existing?.due_date ?? "").toString().slice(0, 10),
    done: pick(b.done, existing?.done ?? 0) ? 1 : 0,
    lead_id: leadId,
    owner_id: pick(b.owner_id, existing?.owner_id ?? null),
    notes: pick(b.notes, existing?.notes ?? ""),
  };
}

export const repo = usingPostgres ? pgRepo : sqliteRepo;
