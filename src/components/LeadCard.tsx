import {
  MoreVertical,
  Trash2,
  Pencil,
  CalendarPlus,
  ThumbsUp,
  ThumbsDown,
  Flame,
  UserCircle2,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";
import type { Lead } from "../types";
import { formatBRL } from "../types";
import Stars from "./Stars";

interface Props {
  lead: Lead;
  showOwner?: boolean;
  onOpen: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: number) => void;
  onAddTask: (lead: Lead) => void;
  onWon: (lead: Lead) => void;
  onLost: (lead: Lead) => void;
  onDragStart: (lead: Lead) => void;
  onDragEnd: () => void;
}

function coolingDays(lead: Lead): number {
  const d = lead.updated_at ? new Date(lead.updated_at).getTime() : Date.now();
  return Math.floor((Date.now() - d) / 86400000);
}

// data de cadastro do lead (= 1o contato) no formato dd/mm/aa
function firstContact(lead: Lead): string {
  if (!lead.created_at) return "";
  const d = new Date(lead.created_at);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function LeadCard({
  lead,
  showOwner,
  onOpen,
  onEdit,
  onDelete,
  onAddTask,
  onWon,
  onLost,
  onDragStart,
  onDragEnd,
}: Props) {
  const [menu, setMenu] = useState(false);
  const cooling = coolingDays(lead);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(lead)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(lead)}
      className="group cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-300 hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-600">
          Em andamento
        </span>
        {cooling >= 7 && (
          <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
            <Flame size={10} /> Esfriando há {cooling} dias
          </span>
        )}
        <div className="relative ml-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenu((v) => !v);
            }}
            className="text-slate-300 hover:text-slate-500"
          >
            <MoreVertical size={16} />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenu(false); }} />
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
                <MenuItem icon={<Pencil size={14} />} label="Editar" onClick={(e) => { e.stopPropagation(); setMenu(false); onEdit(lead); }} />
                <MenuItem icon={<CalendarPlus size={14} />} label="Nova tarefa" onClick={(e) => { e.stopPropagation(); setMenu(false); onAddTask(lead); }} />
                <MenuItem icon={<ThumbsUp size={14} />} label="Marcar venda" onClick={(e) => { e.stopPropagation(); setMenu(false); onWon(lead); }} className="text-emerald-600 hover:bg-emerald-50" />
                <MenuItem icon={<ThumbsDown size={14} />} label="Marcar perda" onClick={(e) => { e.stopPropagation(); setMenu(false); onLost(lead); }} className="text-rose-600 hover:bg-rose-50" />
                <div className="my-1 h-px bg-slate-100" />
                <MenuItem icon={<Trash2 size={14} />} label="Excluir" onClick={(e) => { e.stopPropagation(); setMenu(false); onDelete(lead.id); }} className="text-rose-600 hover:bg-rose-50" />
              </div>
            </>
          )}
        </div>
      </div>

      <p className="truncate text-sm font-semibold text-slate-800">{lead.name}</p>
      {lead.model && <p className="truncate text-xs text-slate-500">{lead.model}</p>}
      {firstContact(lead) && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400" title="Data de cadastro (1º contato)">
          <CalendarDays size={12} /> 1º contato: {firstContact(lead)}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <Stars value={lead.rating} />
        {lead.value > 0 && (
          <span className="text-xs font-semibold text-slate-700">{formatBRL(lead.value)}</span>
        )}
      </div>

      {showOwner && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
          <UserCircle2 size={13} /> {lead.owner_name || "Sem responsável"}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddTask(lead);
          }}
          className="flex w-full items-center justify-center gap-1 rounded-md bg-slate-50 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
        >
          <CalendarPlus size={12} /> Criar tarefa
        </button>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  className = "text-slate-600",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 ${className}`}
    >
      {icon} {label}
    </button>
  );
}
