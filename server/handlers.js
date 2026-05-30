// Logica das rotas, independente de framework.
// Usada tanto pelo Express local quanto pelas funcoes serverless da Vercel.

import { repo, normalizeLead } from "./repo.js";

export async function listLeads() {
  return { status: 200, body: await repo.list() };
}

export async function createLead(body) {
  const data = normalizeLead(body);
  if (!data.name) {
    return { status: 400, body: { error: "O nome e obrigatorio" } };
  }
  const created = await repo.create(data);
  return { status: 201, body: created };
}

export async function updateLead(id, body) {
  const existing = await repo.get(id);
  if (!existing) {
    return { status: 404, body: { error: "Lead nao encontrado" } };
  }
  const data = normalizeLead(body, existing);
  if (!data.name) {
    return { status: 400, body: { error: "O nome e obrigatorio" } };
  }
  const updated = await repo.update(id, data);
  return { status: 200, body: updated };
}

export async function deleteLead(id) {
  const ok = await repo.remove(id);
  if (!ok) return { status: 404, body: { error: "Lead nao encontrado" } };
  return { status: 204, body: null };
}

export async function getStats() {
  return { status: 200, body: await repo.stats() };
}
