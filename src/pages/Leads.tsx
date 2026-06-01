import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import type { Lead, LeadStage, User } from "../types";
import { STAGE_META, STAGE_ORDER, formatBRL } from "../types";
import LeadCard from "../components/LeadCard";
import LeadModal from "../components/LeadModal";
import TaskModal from "../components/TaskModal";
import OutcomeModal from "../components/OutcomeModal";

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// mes (YYYY-MM) em que o lead foi cadastrado
function monthOf(l: Lead): string {
  return (l.created_at || "").slice(0, 7);
}
function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MES[Number(m) - 1] ?? ym}/${(y ?? "").slice(2)}`;
}

export default function Leads() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sellers, setSellers] = useState<User[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<number | "">("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [leadModal, setLeadModal] = useState<"new" | Lead | null>(null);
  const [taskLead, setTaskLead] = useState<Lead | "open" | null>(null);
  const [outcome, setOutcome] = useState<{ lead: Lead; type: "won" | "lost" } | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<LeadStage | null>(null);

  async function load() {
    setLoading(true);
    try {
      setLeads(await api.listLeads("em_andamento", ownerFilter || undefined));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerFilter]);

  useEffect(() => {
    if (isAdmin) {
      api.listUsers().then((us) => setSellers(us.filter((u) => u.active)));
    }
  }, [isAdmin]);

  async function handleSubmit(data: Partial<Lead>) {
    if (leadModal && leadModal !== "new") {
      const updated = await api.updateLead(leadModal.id, data);
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } else {
      const created = await api.createLead(data);
      if (created.status === "em_andamento") load();
    }
  }

  async function handleDelete(id: number) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await api.deleteLead(id);
  }

  async function handleWon(value: number) {
    if (!outcome) return;
    await api.markWon(outcome.lead.id, value);
    setLeads((prev) => prev.filter((l) => l.id !== outcome.lead.id));
  }

  async function handleLost(reason: string) {
    if (!outcome) return;
    await api.markLost(outcome.lead.id, reason);
    setLeads((prev) => prev.filter((l) => l.id !== outcome.lead.id));
  }

  async function handleDrop(stage: LeadStage) {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (id == null) return;
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
    try {
      await api.updateLead(id, { stage });
    } catch {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: lead.stage } : l)));
    }
  }

  // meses disponiveis (a partir das datas de cadastro dos leads), mais recente primeiro
  const months = useMemo(
    () => Array.from(new Set(leads.map(monthOf).filter(Boolean))).sort().reverse(),
    [leads]
  );

  // leads visiveis apos o filtro de mes
  const visibleLeads = useMemo(
    () => (monthFilter ? leads.filter((l) => monthOf(l) === monthFilter) : leads),
    [leads, monthFilter]
  );

  const grouped = useMemo(() => {
    const g = Object.fromEntries(STAGE_ORDER.map((s) => [s, [] as Lead[]])) as Record<LeadStage, Lead[]>;
    for (const l of visibleLeads) g[l.stage]?.push(l);
    return g;
  }, [visibleLeads]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Funil de Vendas</h1>
          <p className="text-sm text-slate-400">
            {visibleLeads.length} negociações em andamento
            {monthFilter ? ` · cadastrados em ${monthLabel(monthFilter)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
          >
            <option value="">Todos os meses</option>
            {months.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          {isAdmin && (
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value ? Number(e.target.value) : "")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
            >
              <option value="">Todos os vendedores</option>
              {sellers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          )}
          <button onClick={() => setTaskLead("open")} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Plus size={16} /> Tarefa
          </button>
          <button onClick={() => setLeadModal("new")} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            <Plus size={16} /> Novo Lead
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Carregando funil...</p>
      ) : (
        <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
          {STAGE_ORDER.map((stage) => {
            const items = grouped[stage];
            const sum = items.reduce((acc, l) => acc + (l.value || 0), 0);
            return (
              <div
                key={stage}
                onDragOver={(e) => { e.preventDefault(); setOverCol(stage); }}
                onDrop={() => handleDrop(stage)}
                className={`flex w-72 shrink-0 flex-col gap-3 rounded-xl p-2 transition ${
                  overCol === stage ? "bg-brand-50 ring-2 ring-brand-200" : "bg-slate-100/50"
                }`}
              >
                <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <span className={`h-2 w-2 rounded-full ${STAGE_META[stage].dot}`} />
                      {STAGE_META[stage].label}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{items.length}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-400">{formatBRL(sum)}</p>
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  {items.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      showOwner={isAdmin}
                      onOpen={(l) => navigate(`/leads/${l.id}`)}
                      onEdit={(l) => setLeadModal(l)}
                      onDelete={handleDelete}
                      onAddTask={(l) => setTaskLead(l)}
                      onWon={(l) => setOutcome({ lead: l, type: "won" })}
                      onLost={(l) => setOutcome({ lead: l, type: "lost" })}
                      onDragStart={(l) => setDragId(l.id)}
                      onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-400">
                      Arraste leads para cá
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {leadModal && (
        <LeadModal
          lead={leadModal === "new" ? null : leadModal}
          sellers={isAdmin ? sellers : undefined}
          onClose={() => setLeadModal(null)}
          onSubmit={handleSubmit}
        />
      )}

      {taskLead && (
        <TaskModal
          leads={leads}
          presetLeadId={taskLead === "open" ? null : taskLead.id}
          onClose={() => setTaskLead(null)}
          onSubmit={async (data) => { await api.createTask(data); }}
        />
      )}

      {outcome && (
        <OutcomeModal
          lead={outcome.lead}
          type={outcome.type}
          onClose={() => setOutcome(null)}
          onConfirmWon={handleWon}
          onConfirmLost={handleLost}
        />
      )}
    </div>
  );
}
