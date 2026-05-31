// Etapa do funil (coluna) — estilo RD Station
export type LeadStage =
  | "sem_contato"
  | "tentando_contato"
  | "identificacao"
  | "negociacao"
  | "proposta_enviada"
  | "fechamento";

// Situacao da negociacao
export type LeadStatus = "em_andamento" | "vendido" | "perdido" | "pausado";

export interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string;
  source: string;
  stage: LeadStage;
  status: LeadStatus;
  model: string;
  payment: string;
  value: number;
  rating: number; // 1..5
  notes: string;
  loss_reason: string;
  owner_id: number | null;
  owner_name: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = "admin" | "seller";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active: number | boolean;
  created_at?: string;
}

export interface Task {
  id: number;
  title: string;
  due_date: string; // YYYY-MM-DD
  done: number; // 0 | 1
  lead_id: number | null;
  lead_name?: string | null;
  notes: string;
  created_at: string;
}

export interface Interaction {
  id: number;
  lead_id: number;
  kind: string; // created | note | stage | won | lost | reactivated
  content: string;
  created_at: string;
}

export const STAGE_META: Record<LeadStage, { label: string; dot: string }> = {
  sem_contato: { label: "Sem contato", dot: "bg-slate-400" },
  tentando_contato: { label: "Tentando contato", dot: "bg-blue-500" },
  identificacao: { label: "Identificação do interesse", dot: "bg-indigo-500" },
  negociacao: { label: "Negociação", dot: "bg-amber-500" },
  proposta_enviada: { label: "Proposta enviada", dot: "bg-violet-500" },
  fechamento: { label: "Fechamento", dot: "bg-emerald-500" },
};

export const STAGE_ORDER: LeadStage[] = [
  "sem_contato",
  "tentando_contato",
  "identificacao",
  "negociacao",
  "proposta_enviada",
  "fechamento",
];

export const STATUS_META: Record<
  LeadStatus,
  { label: string; className: string; dot: string }
> = {
  em_andamento: {
    label: "Em andamento",
    className: "bg-sky-50 text-sky-600",
    dot: "bg-sky-500",
  },
  vendido: {
    label: "Vendido",
    className: "bg-emerald-50 text-emerald-600",
    dot: "bg-emerald-500",
  },
  perdido: {
    label: "Perdido",
    className: "bg-rose-50 text-rose-600",
    dot: "bg-rose-500",
  },
  pausado: {
    label: "Pausado",
    className: "bg-amber-50 text-amber-600",
    dot: "bg-amber-500",
  },
};

export const PAYMENT_OPTIONS = [
  "A vista",
  "Financiamento",
  "Consórcio",
  "Cartão",
  "Outro",
];

export function formatBRL(value: number): string {
  return (value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
