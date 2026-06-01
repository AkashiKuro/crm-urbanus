import type { Lead, Task, Interaction, LeadStatus, User } from "./types";

const BASE = "/api";
const TOKEN_KEY = "crm_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function http<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401) {
    setToken(null);
    // recarrega para cair na tela de login
    if (!url.startsWith("/auth/")) window.location.reload();
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!res.ok) {
    let msg = "";
    try {
      const data = await res.json();
      msg = data.error || JSON.stringify(data);
    } catch {
      msg = await res.text();
    }
    throw new Error(msg || `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface SellerStat {
  id: number;
  name: string;
  total: number;
  vendas: number;
  faturado: number;
  abertos: number;
}

export interface Stats {
  total: number;
  byStage: Record<string, number>;
  byStatus: Record<string, number>;
  leadsThisMonth: number;
  wonThisMonth: number;
  wonValueThisMonth: number;
  lostThisMonth: number;
  conversion: number;
  openValue: number;
  tasksPending: number;
  monthly: { month: string; count: number }[];
  perSeller: SellerStat[];
  recent: Lead[];
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    http<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => http<User>("/auth/me"),

  // Users (admin)
  listUsers: () => http<User[]>("/users"),
  createUser: (data: Partial<User> & { password: string }) =>
    http<User>("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: number, data: Partial<User> & { password?: string }) =>
    http<User>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Leads
  listLeads: (status?: LeadStatus, owner?: number) => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (owner) p.set("owner", String(owner));
    const qs = p.toString();
    return http<Lead[]>(`/leads${qs ? `?${qs}` : ""}`);
  },
  getLead: (id: number) => http<Lead>(`/leads/${id}`),
  createLead: (data: Partial<Lead>) =>
    http<Lead>("/leads", { method: "POST", body: JSON.stringify(data) }),
  updateLead: (id: number, data: Partial<Lead>) =>
    http<Lead>(`/leads/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteLead: (id: number) => http<void>(`/leads/${id}`, { method: "DELETE" }),

  markWon: (id: number, value?: number) =>
    http<Lead>(`/leads/${id}/outcome`, { method: "POST", body: JSON.stringify({ action: "won", value }) }),
  markLost: (id: number, loss_reason: string) =>
    http<Lead>(`/leads/${id}/outcome`, { method: "POST", body: JSON.stringify({ action: "lost", loss_reason }) }),
  reactivateLead: (id: number, stage?: string) =>
    http<Lead>(`/leads/${id}/outcome`, { method: "POST", body: JSON.stringify({ action: "reactivate", stage }) }),

  // Interactions
  listInteractions: (leadId: number) =>
    http<Interaction[]>(`/leads/${leadId}/interactions`),
  addInteraction: (leadId: number, content: string) =>
    http<Interaction>(`/leads/${leadId}/interactions`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  stats: (owner?: number) => http<Stats>(`/stats${owner ? `?owner=${owner}` : ""}`),

  // Tasks
  listTasks: () => http<Task[]>("/tasks"),
  createTask: (data: Partial<Task>) =>
    http<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id: number, data: Partial<Task>) =>
    http<Task>(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTask: (id: number) => http<void>(`/tasks/${id}`, { method: "DELETE" }),
};
