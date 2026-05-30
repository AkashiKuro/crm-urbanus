import { useState } from "react";
import { X } from "lucide-react";
import type { Lead, LeadStatus, LeadTag } from "../types";
import { STATUS_META, TAG_META, STATUS_ORDER } from "../types";

interface Props {
  onClose: () => void;
  onCreate: (data: Partial<Lead>) => Promise<void>;
}

export default function NewLeadModal({ onClose, onCreate }: Props) {
  const [form, setForm] = useState<Partial<Lead>>({
    name: "",
    phone: "",
    email: "",
    source: "website",
    status: "new",
    tag: "in_process",
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
      await onCreate(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Novo Lead</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label="Nome *">
            <input
              autoFocus
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              className="input"
              placeholder="Ex: Maria Silva"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone">
              <input
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                className="input"
                placeholder="(00) 00000-0000"
              />
            </Field>
            <Field label="Origem">
              <input
                value={form.source ?? ""}
                onChange={(e) => set("source", e.target.value)}
                className="input"
                placeholder="website"
              />
            </Field>
          </div>

          <Field label="Email">
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              className="input"
              placeholder="email@exemplo.com"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as LeadStatus)}
                className="input"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Situação">
              <select
                value={form.tag}
                onChange={(e) => set("tag", e.target.value as LeadTag)}
                className="input"
              >
                {(Object.keys(TAG_META) as LeadTag[]).map((t) => (
                  <option key={t} value={t}>
                    {TAG_META[t].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
