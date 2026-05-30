import { useEffect, useMemo, useState } from "react";
import { Download, Plus, SlidersHorizontal, ChevronDown } from "lucide-react";
import { api } from "../api";
import type { Lead, LeadStatus } from "../types";
import { STATUS_META, STATUS_ORDER } from "../types";
import LeadCard from "../components/LeadCard";
import NewLeadModal from "../components/NewLeadModal";

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setLeads(await api.listLeads());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(data: Partial<Lead>) {
    const created = await api.createLead(data);
    setLeads((prev) => [created, ...prev]);
  }

  async function handleDelete(id: number) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await api.deleteLead(id);
  }

  const grouped = useMemo(() => {
    const g: Record<LeadStatus, Lead[]> = {
      new: [],
      open: [],
      in_progress: [],
      open_deal: [],
    };
    for (const l of leads) g[l.status]?.push(l);
    return g;
  }, [leads]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Leads</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} /> Novo Lead
          </button>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-3">
        <FilterChip label="All Status" />
        <FilterChip label="All Sources" />
        <button className="ml-auto flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <SlidersHorizontal size={15} /> Filter
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Carregando leads...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STATUS_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              leads={grouped[status]}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewLeadModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

function Column({
  status,
  leads,
  onDelete,
}: {
  status: LeadStatus;
  leads: Lead[];
  onDelete: (id: number) => void;
}) {
  const meta = STATUS_META[status];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 shadow-sm">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          {leads.length} Leads
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onDelete={onDelete} />
        ))}
        {leads.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
            Sem leads
          </p>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
      {label}
      <ChevronDown size={14} className="text-slate-400" />
    </button>
  );
}
