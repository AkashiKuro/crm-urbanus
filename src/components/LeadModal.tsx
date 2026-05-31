import { useState } from "react";
import { X } from "lucide-react";
import type { Lead, LeadStage, User } from "../types";
import { STAGE_META, STAGE_ORDER, PAYMENT_OPTIONS } from "../types";
import Stars from "./Stars";

interface Props {
  lead?: Lead | null;
  sellers?: User[]; // se vier (admin), permite escolher o responsavel
  onClose: () => void;
  onSubmit: (data: Partial<Lead>) => Promise<void>;
}

export default function LeadModal({ lead, sellers, onClose, onSubmit }: Props) {
  const isEdit = Boolean(lead);
  const [form, setForm] = useState<Partial<Lead>>({
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    source: lead?.source ?? "site",
    stage: lead?.stage ?? "sem_contato",
    model: lead?.model ?? "",
    payment: lead?.payment ?? "",
    value: lead?.value ?? 0,
    rating: lead?.rating ?? 1,
    notes: lead?.notes ?? "",
    owner_id: lead?.owner_id ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof Lead>(key: K, value: Lead[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) {
      setError("Informe o nome do lead.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? "Editar Lead" : "Novo Lead"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label="Nome *">
            <input autoFocus value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} className="input" placeholder="Ex: Maria Silva" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone">
              <input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className="input" placeholder="(00) 00000-0000" />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} className="input" placeholder="email@exemplo.com" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Modelo de interesse">
              <input value={form.model ?? ""} onChange={(e) => set("model", e.target.value)} className="input" placeholder="Ex: Master Ride 150" />
            </Field>
            <Field label="Forma de pagamento">
              <select value={form.payment ?? ""} onChange={(e) => set("payment", e.target.value)} className="input">
                <option value="">—</option>
                {PAYMENT_OPTIONS.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input type="number" min={0} step="0.01" value={form.value ?? 0} onChange={(e) => set("value", Number(e.target.value))} className="input" placeholder="0,00" />
            </Field>
            <Field label="Origem">
              <input value={form.source ?? ""} onChange={(e) => set("source", e.target.value)} className="input" placeholder="site, indicação..." />
            </Field>
          </div>

          <Field label="Etapa do funil">
            <select value={form.stage} onChange={(e) => set("stage", e.target.value as LeadStage)} className="input">
              {STAGE_ORDER.map((s) => (<option key={s} value={s}>{STAGE_META[s].label}</option>))}
            </select>
          </Field>

          {sellers && (
            <Field label="Responsável">
              <select
                value={form.owner_id ?? ""}
                onChange={(e) => set("owner_id", e.target.value ? Number(e.target.value) : null)}
                className="input"
              >
                <option value="">— Sem responsável —</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Qualificação">
            <Stars value={form.rating ?? 1} onChange={(v) => set("rating", v)} size={20} />
          </Field>

          <Field label="Observações">
            <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className="input min-h-[64px] resize-y" placeholder="Anotações sobre o contato..." />
          </Field>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
              {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Salvar Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
