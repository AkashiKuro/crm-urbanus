import { Phone, Mail, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Lead } from "../types";
import { TAG_META } from "../types";

interface Props {
  lead: Lead;
  onDelete: (id: number) => void;
}

export default function LeadCard({ lead, onDelete }: Props) {
  const [menu, setMenu] = useState(false);
  const tag = TAG_META[lead.tag];
  const avatar = `https://i.pravatar.cc/80?u=${encodeURIComponent(
    lead.email || lead.name
  )}`;

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <img
          src={avatar}
          alt={lead.name}
          className="h-9 w-9 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {lead.name}
          </p>
          <p className="text-xs text-slate-400">Today 10:30PM</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenu((v) => !v)}
            className="text-slate-300 hover:text-slate-500"
          >
            <MoreVertical size={16} />
          </button>
          {menu && (
            <div className="absolute right-0 z-10 mt-1 w-32 rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  setMenu(false);
                  onDelete(lead.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Phone size={13} className="text-slate-400" />
          {lead.phone || "—"}
        </p>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Mail size={13} className="text-slate-400" />
          <span className="truncate">{lead.email || "—"}</span>
        </p>
      </div>

      <span
        className={`mt-3 inline-block rounded-md px-2 py-1 text-[11px] font-medium ${tag.className}`}
      >
        {tag.label}
      </span>
    </div>
  );
}
