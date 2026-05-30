// Servidor Express para desenvolvimento LOCAL.
// Na Vercel as rotas sao servidas pelas funcoes em /api (este arquivo nao roda la).

import express from "express";
import cors from "cors";
import {
  listLeads,
  createLead,
  updateLead,
  deleteLead,
  getStats,
} from "./handlers.js";
import { usingPostgres } from "./repo.js";

const app = express();
app.use(cors());
app.use(express.json());

function send(res, result) {
  if (result.status === 204) return res.status(204).end();
  res.status(result.status).json(result.body);
}

app.get("/api/leads", async (_req, res) => send(res, await listLeads()));
app.post("/api/leads", async (req, res) => send(res, await createLead(req.body)));
app.put("/api/leads/:id", async (req, res) =>
  send(res, await updateLead(Number(req.params.id), req.body))
);
app.delete("/api/leads/:id", async (req, res) =>
  send(res, await deleteLead(Number(req.params.id)))
);
app.get("/api/stats", async (_req, res) => send(res, await getStats()));

const PORT = 3001;
app.listen(PORT, () => {
  const backend = usingPostgres ? "Postgres (Supabase)" : "SQLite (local)";
  console.log(`[server] API rodando em http://localhost:${PORT}`);
  console.log(`[server] Banco de dados: ${backend}`);
});
