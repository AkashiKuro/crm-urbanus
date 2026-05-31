// Servidor Express para desenvolvimento LOCAL.
// Na Vercel as rotas sao servidas pelas funcoes em /api (este arquivo nao roda la).

import express from "express";
import cors from "cors";
import {
  login,
  me,
  listUsers,
  createUser,
  updateUser,
  listLeads,
  createLead,
  getLead,
  updateLead,
  deleteLead,
  markWon,
  markLost,
  reactivateLead,
  getStats,
  listInteractions,
  addInteraction,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
} from "./handlers.js";
import { getAuthUser } from "./auth.js";
import { usingPostgres } from "./repo.js";

const app = express();
app.use(cors());
app.use(express.json());

function send(res, result) {
  if (result.status === 204) return res.status(204).end();
  res.status(result.status).json(result.body);
}
// injeta o usuario autenticado em req.user
function auth(req, _res, next) {
  req.user = getAuthUser(req);
  next();
}
app.use(auth);

const id = (req) => Number(req.params.id);

// Auth
app.post("/api/auth/login", async (req, res) => send(res, await login(req.body)));
app.get("/api/auth/me", async (req, res) => send(res, await me(req.user)));

// Users (admin)
app.get("/api/users", async (req, res) => send(res, await listUsers(req.user)));
app.post("/api/users", async (req, res) => send(res, await createUser(req.user, req.body)));
app.put("/api/users/:id", async (req, res) => send(res, await updateUser(req.user, id(req), req.body)));

// Leads
app.get("/api/leads", async (req, res) => send(res, await listLeads(req.user, req.query)));
app.post("/api/leads", async (req, res) => send(res, await createLead(req.user, req.body)));
app.get("/api/leads/:id", async (req, res) => send(res, await getLead(req.user, id(req))));
app.put("/api/leads/:id", async (req, res) => send(res, await updateLead(req.user, id(req), req.body)));
app.delete("/api/leads/:id", async (req, res) => send(res, await deleteLead(req.user, id(req))));
app.post("/api/leads/:id/won", async (req, res) => send(res, await markWon(req.user, id(req), req.body)));
app.post("/api/leads/:id/lost", async (req, res) => send(res, await markLost(req.user, id(req), req.body)));
app.post("/api/leads/:id/reactivate", async (req, res) => send(res, await reactivateLead(req.user, id(req), req.body)));
app.get("/api/leads/:id/interactions", async (req, res) => send(res, await listInteractions(req.user, id(req))));
app.post("/api/leads/:id/interactions", async (req, res) => send(res, await addInteraction(req.user, id(req), req.body)));

app.get("/api/stats", async (req, res) => send(res, await getStats(req.user, req.query)));

// Tasks
app.get("/api/tasks", async (req, res) => send(res, await listTasks(req.user)));
app.post("/api/tasks", async (req, res) => send(res, await createTask(req.user, req.body)));
app.put("/api/tasks/:id", async (req, res) => send(res, await updateTask(req.user, id(req), req.body)));
app.delete("/api/tasks/:id", async (req, res) => send(res, await deleteTask(req.user, id(req))));

const PORT = 3001;
app.listen(PORT, () => {
  const backend = usingPostgres ? "Postgres (Supabase)" : "SQLite (local)";
  console.log(`[server] API rodando em http://localhost:${PORT}`);
  console.log(`[server] Banco de dados: ${backend}`);
});
