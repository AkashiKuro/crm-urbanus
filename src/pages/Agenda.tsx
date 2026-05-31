import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, User, CheckCircle2, Circle } from "lucide-react";
import { api } from "../api";
import type { Task, Lead } from "../types";
import TaskModal from "../components/TaskModal";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function dateLabel(iso: string) {
  const today = todayStr();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (iso < today) return "Atrasadas";
  if (iso === today) return "Hoje";
  if (iso === tomorrow) return "Amanhã";
  return formatDate(iso);
}

export default function Agenda() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"new" | Task | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [t, l] = await Promise.all([api.listTasks(), api.listLeads()]);
      setTasks(t);
      setLeads(l);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(data: Partial<Task>) {
    if (modal && modal !== "new") {
      const updated = await api.updateTask(modal.id, data);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await api.createTask(data);
      setTasks((prev) => [...prev, created]);
    }
  }

  async function toggleDone(task: Task) {
    const updated = await api.updateTask(task.id, { done: task.done ? 0 : 1 });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleDelete(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await api.deleteTask(id);
  }

  // separa pendentes (agrupadas por data) e concluidas
  const { groups, doneTasks } = useMemo(() => {
    const pending = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);
    const byDate = new Map<string, Task[]>();
    for (const t of pending) {
      const arr = byDate.get(t.due_date) ?? [];
      arr.push(t);
      byDate.set(t.due_date, arr);
    }
    const ordered = [...byDate.entries()].sort((a, b) =>
      a[0] < b[0] ? -1 : 1
    );
    return { groups: ordered, doneTasks: done };
  }, [tasks]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
        <button
          onClick={() => setModal("new")}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <Plus size={16} /> Nova Tarefa
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Carregando agenda...</p>
      ) : tasks.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <p className="text-sm font-medium text-slate-500">
            Nenhuma tarefa ainda
          </p>
          <p className="text-xs text-slate-400">
            Clique em "Nova Tarefa" para começar a organizar seus contatos.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([date, items]) => {
            const overdue = date < todayStr();
            return (
              <section key={date}>
                <h2
                  className={`mb-2 text-sm font-semibold ${
                    overdue ? "text-rose-600" : "text-slate-600"
                  }`}
                >
                  {dateLabel(date)}{" "}
                  <span className="font-normal text-slate-400">
                    · {formatDate(date)}
                  </span>
                </h2>
                <div className="space-y-2">
                  {items.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onToggle={() => toggleDone(t)}
                      onEdit={() => setModal(t)}
                      onDelete={() => handleDelete(t.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {doneTasks.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-slate-400">
                Concluídas ({doneTasks.length})
              </h2>
              <div className="space-y-2">
                {doneTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={() => toggleDone(t)}
                    onEdit={() => setModal(t)}
                    onDelete={() => handleDelete(t.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {modal && (
        <TaskModal
          task={modal === "new" ? null : modal}
          leads={leads}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <button
        onClick={onToggle}
        className={task.done ? "text-emerald-500" : "text-slate-300 hover:text-brand-500"}
      >
        {task.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
      </button>

      <div className="min-w-0 flex-1" onClick={onEdit} role="button">
        <p
          className={`truncate text-sm font-medium ${
            task.done ? "text-slate-400 line-through" : "text-slate-700"
          }`}
        >
          {task.title}
        </p>
        {task.lead_name && (
          <p className="flex items-center gap-1 truncate text-xs text-slate-400">
            <User size={12} /> {task.lead_name}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
