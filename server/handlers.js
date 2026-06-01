// Logica das rotas, independente de framework.
// Usada pelo Express local e pelas funcoes serverless da Vercel.
//
// Quase tudo exige um usuario autenticado (param `user`, vindo do token).
// Regras: admin ve/edita tudo; seller so os proprios leads.

import { repo, normalizeLead, normalizeTask, VALID_ROLE } from "./repo.js";
import { hashPassword, verifyPassword, signToken } from "./auth.js";

const UNAUTH = { status: 401, body: { error: "Nao autenticado" } };
const FORBIDDEN = { status: 403, body: { error: "Sem permissao" } };

function isAdmin(user) {
  return user && user.role === "admin";
}

function canAccessLead(user, lead) {
  return isAdmin(user) || (lead && lead.owner_id === user.id);
}

/* ---------------- Auth ---------------- */

export async function login(body) {
  const email = (body?.email || "").toString().trim();
  const password = (body?.password || "").toString();
  if (!email || !password) {
    return { status: 400, body: { error: "Informe usuario e senha" } };
  }
  const u = await repo.getUserByEmail(email);
  if (!u || !verifyPassword(password, u.password)) {
    return { status: 401, body: { error: "Usuario ou senha incorretos" } };
  }
  if (!u.active) {
    return { status: 403, body: { error: "Usuario inativo. Fale com o administrador." } };
  }
  const safe = { id: u.id, name: u.name, email: u.email, role: u.role };
  return { status: 200, body: { token: signToken(safe), user: safe } };
}

export async function me(user) {
  if (!user) return UNAUTH;
  const u = await repo.getUser(user.id);
  if (!u) return UNAUTH;
  return { status: 200, body: u };
}

/* ---------------- Users (admin) ---------------- */

export async function listUsers(user) {
  if (!user) return UNAUTH;
  if (!isAdmin(user)) return FORBIDDEN;
  return { status: 200, body: await repo.listUsers() };
}

export async function createUser(user, body) {
  if (!user) return UNAUTH;
  if (!isAdmin(user)) return FORBIDDEN;
  const name = (body?.name || "").toString().trim();
  const email = (body?.email || "").toString().trim();
  const password = (body?.password || "").toString();
  const role = VALID_ROLE.includes(body?.role) ? body.role : "seller";
  if (!name || !email || !password) {
    return { status: 400, body: { error: "Nome, usuario e senha sao obrigatorios" } };
  }
  if (password.length < 6) {
    return { status: 400, body: { error: "A senha deve ter ao menos 6 caracteres" } };
  }
  const exists = await repo.getUserByEmail(email);
  if (exists) return { status: 409, body: { error: "Ja existe um usuario com esse nome de usuario" } };
  const created = await repo.createUser({ name, email, password: hashPassword(password), role });
  return { status: 201, body: created };
}

export async function updateUser(user, id, body) {
  if (!user) return UNAUTH;
  if (!isAdmin(user)) return FORBIDDEN;
  const existing = await repo.getUser(id);
  if (!existing) return { status: 404, body: { error: "Usuario nao encontrado" } };
  const data = {
    name: (body?.name ?? existing.name).toString().trim(),
    email: (body?.email ?? existing.email).toString().trim(),
    role: VALID_ROLE.includes(body?.role) ? body.role : existing.role,
    active: body?.active === undefined ? existing.active : Boolean(body.active),
    password: null,
  };
  if (body?.password) {
    if (body.password.length < 6) {
      return { status: 400, body: { error: "A senha deve ter ao menos 6 caracteres" } };
    }
    data.password = hashPassword(body.password);
  }
  // nao deixar desativar o proprio admin logado
  if (id === user.id && data.active === false) {
    return { status: 400, body: { error: "Voce nao pode desativar a si mesmo" } };
  }
  const updated = await repo.updateUser(id, data);
  return { status: 200, body: updated };
}

/* ---------------- Leads ---------------- */

export async function listLeads(user, query = {}) {
  if (!user) return UNAUTH;
  const status = query.status || null;
  let ownerId = null;
  if (isAdmin(user)) {
    ownerId = query.owner ? Number(query.owner) : null; // admin pode filtrar
  } else {
    ownerId = user.id; // seller: so os seus
  }
  return { status: 200, body: await repo.list({ status, ownerId }) };
}

export async function createLead(user, body) {
  if (!user) return UNAUTH;
  const data = normalizeLead(body);
  if (!data.name) return { status: 400, body: { error: "O nome e obrigatorio" } };
  // dono = quem criou (admin pode escolher outro via owner_id)
  if (isAdmin(user) && body?.owner_id) {
    data.owner_id = Number(body.owner_id);
  } else {
    data.owner_id = user.id;
  }
  const created = await repo.create(data);
  await repo.addInteraction(created.id, {
    user_id: user.id,
    kind: "created",
    content: `Lead criado por ${user.name}`,
  });
  return { status: 201, body: created };
}

export async function getLead(user, id) {
  if (!user) return UNAUTH;
  const lead = await repo.get(id);
  if (!lead) return { status: 404, body: { error: "Lead nao encontrado" } };
  if (!canAccessLead(user, lead)) return FORBIDDEN;
  return { status: 200, body: lead };
}

export async function updateLead(user, id, body) {
  if (!user) return UNAUTH;
  const existing = await repo.get(id);
  if (!existing) return { status: 404, body: { error: "Lead nao encontrado" } };
  if (!canAccessLead(user, existing)) return FORBIDDEN;
  const data = normalizeLead(body, existing);
  if (!data.name) return { status: 400, body: { error: "O nome e obrigatorio" } };
  // so admin pode reatribuir o dono
  if (!isAdmin(user)) data.owner_id = existing.owner_id;
  const updated = await repo.update(id, data);
  if (body.stage && body.stage !== existing.stage) {
    await repo.addInteraction(id, {
      user_id: user.id,
      kind: "stage",
      content: `Movido para etapa: ${body.stage}`,
    });
  }
  if (isAdmin(user) && body.owner_id && Number(body.owner_id) !== existing.owner_id) {
    await repo.addInteraction(id, {
      user_id: user.id,
      kind: "assign",
      content: `Responsavel alterado para ${updated.owner_name || "—"}`,
    });
  }
  return { status: 200, body: updated };
}

export async function deleteLead(user, id) {
  if (!user) return UNAUTH;
  const existing = await repo.get(id);
  if (!existing) return { status: 404, body: { error: "Lead nao encontrado" } };
  if (!canAccessLead(user, existing)) return FORBIDDEN;
  await repo.remove(id);
  return { status: 204, body: null };
}

export async function markWon(user, id, body = {}) {
  if (!user) return UNAUTH;
  const existing = await repo.get(id);
  if (!existing) return { status: 404, body: { error: "Lead nao encontrado" } };
  if (!canAccessLead(user, existing)) return FORBIDDEN;
  const data = normalizeLead(
    { ...existing, status: "vendido", stage: "fechamento", value: body.value ?? existing.value, closed_at: new Date().toISOString() },
    existing
  );
  const updated = await repo.update(id, data);
  await repo.addInteraction(id, {
    user_id: user.id,
    kind: "won",
    content: `Venda registrada (R$ ${Number(updated.value).toFixed(2)})`,
  });
  return { status: 200, body: updated };
}

export async function markLost(user, id, body = {}) {
  if (!user) return UNAUTH;
  const existing = await repo.get(id);
  if (!existing) return { status: 404, body: { error: "Lead nao encontrado" } };
  if (!canAccessLead(user, existing)) return FORBIDDEN;
  const reason = (body.loss_reason || "").toString().trim();
  if (!reason) return { status: 400, body: { error: "Informe o motivo da perda" } };
  const data = normalizeLead(
    { ...existing, status: "perdido", loss_reason: reason, closed_at: new Date().toISOString() },
    existing
  );
  const updated = await repo.update(id, data);
  await repo.addInteraction(id, {
    user_id: user.id,
    kind: "lost",
    content: `Marcado como perdido. Motivo: ${reason}`,
  });
  return { status: 200, body: updated };
}

export async function reactivateLead(user, id, body = {}) {
  if (!user) return UNAUTH;
  const existing = await repo.get(id);
  if (!existing) return { status: 404, body: { error: "Lead nao encontrado" } };
  if (!canAccessLead(user, existing)) return FORBIDDEN;
  const data = normalizeLead(
    { ...existing, status: "em_andamento", stage: body.stage || "tentando_contato", loss_reason: "", closed_at: null },
    existing
  );
  const updated = await repo.update(id, data);
  await repo.addInteraction(id, {
    user_id: user.id,
    kind: "reactivated",
    content: "Lead recuperado / reativado",
  });
  return { status: 200, body: updated };
}

export async function getStats(user, query = {}) {
  if (!user) return UNAUTH;
  let ownerId = null;
  if (isAdmin(user)) ownerId = query.owner ? Number(query.owner) : null;
  else ownerId = user.id;
  return { status: 200, body: await repo.stats({ ownerId }) };
}

/* ---------------- Interactions ---------------- */

export async function listInteractions(user, leadId) {
  if (!user) return UNAUTH;
  const lead = await repo.get(leadId);
  if (!lead) return { status: 404, body: { error: "Lead nao encontrado" } };
  if (!canAccessLead(user, lead)) return FORBIDDEN;
  return { status: 200, body: await repo.listInteractions(leadId) };
}

export async function addInteraction(user, leadId, body) {
  if (!user) return UNAUTH;
  const lead = await repo.get(leadId);
  if (!lead) return { status: 404, body: { error: "Lead nao encontrado" } };
  if (!canAccessLead(user, lead)) return FORBIDDEN;
  const content = (body?.content || "").toString().trim();
  if (!content) return { status: 400, body: { error: "Escreva uma anotacao" } };
  const created = await repo.addInteraction(leadId, {
    user_id: user.id,
    kind: body.kind || "note",
    content,
  });
  return { status: 201, body: created };
}

/* ---------------- Tasks ---------------- */

export async function listTasks(user) {
  if (!user) return UNAUTH;
  const ownerId = isAdmin(user) ? null : user.id;
  return { status: 200, body: await repo.listTasks({ ownerId }) };
}

export async function createTask(user, body) {
  if (!user) return UNAUTH;
  const data = normalizeTask(body);
  if (!data.title) return { status: 400, body: { error: "O titulo da tarefa e obrigatorio" } };
  if (!data.due_date) return { status: 400, body: { error: "A data da tarefa e obrigatoria" } };
  data.owner_id = user.id;
  const created = await repo.createTask(data);
  return { status: 201, body: created };
}

export async function updateTask(user, id, body) {
  if (!user) return UNAUTH;
  const existing = await repo.getTask(id);
  if (!existing) return { status: 404, body: { error: "Tarefa nao encontrada" } };
  if (!isAdmin(user) && existing.owner_id && existing.owner_id !== user.id) return FORBIDDEN;
  const data = normalizeTask(body, existing);
  if (!data.title) return { status: 400, body: { error: "O titulo da tarefa e obrigatorio" } };
  const updated = await repo.updateTask(id, data);
  return { status: 200, body: updated };
}

export async function deleteTask(user, id) {
  if (!user) return UNAUTH;
  const existing = await repo.getTask(id);
  if (!existing) return { status: 404, body: { error: "Tarefa nao encontrada" } };
  if (!isAdmin(user) && existing.owner_id && existing.owner_id !== user.id) return FORBIDDEN;
  await repo.removeTask(id);
  return { status: 204, body: null };
}
