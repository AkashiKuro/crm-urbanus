import type { Lead } from "./types";

const BASE = "/api";

async function http<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listLeads: () => http<Lead[]>("/leads"),
  createLead: (data: Partial<Lead>) =>
    http<Lead>("/leads", { method: "POST", body: JSON.stringify(data) }),
  updateLead: (id: number, data: Partial<Lead>) =>
    http<Lead>(`/leads/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteLead: (id: number) =>
    http<void>(`/leads/${id}`, { method: "DELETE" }),
  stats: () =>
    http<{
      total: number;
      byStatus: Record<string, number>;
      byTag: Record<string, number>;
      recent: Lead[];
    }>("/stats"),
};
