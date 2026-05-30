import { useEffect, useState } from "react";
import {
  Users,
  TrendingUp,
  Flame,
  Recycle,
  ArrowUpRight,
} from "lucide-react";
import { api } from "../api";
import type { Lead } from "../types";
import { STATUS_META, STATUS_ORDER, TAG_META } from "../types";

type Stats = Awaited<ReturnType<typeof api.stats>>;

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.stats().then(setStats);
  }, []);

  if (!stats) {
    return <p className="text-sm text-slate-400">Carregando dashboard...</p>;
  }

  const cards = [
    {
      label: "Total de Leads",
      value: stats.total,
      icon: Users,
      color: "bg-brand-500",
    },
    {
      label: "Em Processo",
      value: stats.byTag.in_process ?? 0,
      icon: TrendingUp,
      color: "bg-orange-500",
    },
    {
      label: "Negócios Abertos",
      value: stats.byStatus.open_deal ?? 0,
      icon: Flame,
      color: "bg-sky-500",
    },
    {
      label: "Reciclados",
      value: stats.byTag.recycled ?? 0,
      icon: Recycle,
      color: "bg-cyan-500",
    },
  ];

  const maxStatus = Math.max(
    1,
    ...STATUS_ORDER.map((s) => stats.byStatus[s] ?? 0)
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl text-white ${c.color}`}
              >
                <c.icon size={18} />
              </span>
              <ArrowUpRight size={16} className="text-slate-300" />
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-800">{c.value}</p>
            <p className="text-sm text-slate-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Leads por status
          </h2>
          <div className="space-y-4">
            {STATUS_ORDER.map((s) => {
              const v = stats.byStatus[s] ?? 0;
              return (
                <div key={s}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span
                        className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`}
                      />
                      {STATUS_META[s].label}
                    </span>
                    <span className="text-slate-400">{v}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${STATUS_META[s].dot}`}
                      style={{ width: `${(v / maxStatus) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Leads recentes
          </h2>
          <div className="space-y-3">
            {stats.recent.map((lead: Lead) => (
              <div key={lead.id} className="flex items-center gap-3">
                <img
                  src={`https://i.pravatar.cc/64?u=${encodeURIComponent(
                    lead.email || lead.name
                  )}`}
                  className="h-8 w-8 rounded-full object-cover"
                  alt={lead.name}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {lead.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {lead.email || lead.phone}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                    TAG_META[lead.tag].className
                  }`}
                >
                  {TAG_META[lead.tag].label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
