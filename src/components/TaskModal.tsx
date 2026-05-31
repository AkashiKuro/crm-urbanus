import { useState } from "react";
import { X } from "lucide-react";
import type { Task, Lead } from "../types";

interface Props {
  task?: Task | null; // edicao se vier
  leads: Lead[]; // para vincular a um cliente
  presetLeadId?: number | null; // quando criada a partir de um card
  onClose: () => void;
  onSubmit: (data: Partial<Task>) => Promise<void>;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function TaskModal({
  task,
  leads,
  presetLeadId,
  onClose,
  onSubmit,
}: Props) {
  const isEdit = Boolean(task);
  const [form, setForm] = useState<Partial<Task>>({
    title: task?.title ?? "",
    due_date: task?.due_date ?? today(),
    lead_id: task?.lead_id ?? presetLeadId ?? null,
    notes: task?.notes ?? "",
    done: task?.done ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof Task>(key: K, value: Task[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title?.trim()) {
      setError("Informe o título da tarefa.");
      return;
    }
    if (!form.due_date) {
      setError("Informe a data.");
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Editar Tarefa" : "Nova Tarefa"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label="Tarefa *">
            <input
              autoFocus
              value={form.title ?? ""}
              onChange={(e) => set("title", e.target.value)}
              className="input"
              placeholder="Ex: Ligar para o cliente"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data *">
              <input
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => set("due_date", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Cliente (opcional)">
              <select
                value={form.lead_id ?? ""}
                onChange={(e) =>
                  set(
                    "lead_id",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="input"
              >
                <option value="">— Sem cliente —</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Observações">
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              className="input min-h-[72px] resize-y"
              placeholder="Detalhes da tarefa..."
            />
          </Field>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={Boolean(form.done)}
                onChange={(e) => set("done", e.target.checked ? 1 : 0)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Concluída
            </label>
          )}

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
              {saving ? "Salvando..." : isEdit ? "Salvar" : "Criar tarefa"}
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
