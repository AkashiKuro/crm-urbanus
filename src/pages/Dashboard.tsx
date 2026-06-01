import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  CalendarClock,
  DollarSign,
  ArrowUpRight,
  Trophy,
} from "lucide-react";
import { api } from "../api";
import type { Stats } from "../api";
import { useAuth } from "../auth";
import type { Lead, User } from "../types";
import { STAGE_META, STAGE_ORDER, formatBRL } from "../types";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function monthLabel(ym: string) {
  const m = Number(ym.split("-")[1]);
  return MONTHS[m - 1] ?? ym;
}

// "2026-06" -> "Junho 2026"
function monthLabelFull(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTHS_FULL[Number(m) - 1] ?? ym} ${y}`;
}

// lista dos ultimos N meses no formato YYYY-MM (mais recente primeiro)
function lastMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 7));
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);
const MONTH_OPTIONS = lastMonths(12);

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [sellers, setSellers] = useState<User[]>([]);
  const [ownerFilter, setOwnerFilter] = useState<number | "">("");
  const [month, setMonth] = useState<string>(CURRENT_MONTH);

  useEffect(() => {
    api.stats(ownerFilter || undefined, month).then(setStats);
  }, [ownerFilter, month]);

  useEffect(() => {
    if (isAdmin) api.listUsers().then((us) => setSellers(us.filter((u) => u.active)));
  }, [isAdmin]);

  if (!stats) return <p className="text-sm text-slate-400">Carregando dashboard...</p>;

  const mShort = MONTHS[Number(month.split("-")[1]) - 1] ?? month;
  const cards = [
    { label: `Leads em ${mShort}`, value: stats.leadsThisMonth, icon: Users, color: "bg-brand-500" },
    { label: `Vendas em ${mShort}`, value: stats.wonThisMonth, icon: CheckCircle2, color: "bg-emerald-500" },
    { label: `Conversão em ${mShort}`, value: `${stats.conversion}%`, icon: TrendingUp, color: "bg-violet-500" },
    { label: `Faturado em ${mShort}`, value: formatBRL(stats.wonValueThisMonth), icon: DollarSign, color: "bg-amber-500", small: true },
  ];

  const maxStage = Math.max(1, ...STAGE_ORDER.map((s) => stats.byStage[s] ?? 0));
  const maxMonthly = Math.max(1, ...stats.monthly.map((m) => m.count));
  const last6 = stats.monthly.slice(-6);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400">
            {isAdmin && !ownerFilter
              ? "Desempenho geral da equipe"
              : "Acompanhe seu desempenho de vendas"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {monthLabelFull(m)}{m === CURRENT_MONTH ? " (atual)" : ""}
              </option>
            ))}
          </select>
          {isAdmin && (
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value ? Number(e.target.value) : "")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
            >
              <option value="">Equipe inteira</option>
              {sellers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-xl text-white ${c.color}`}>
                <c.icon size={18} />
              </span>
              <ArrowUpRight size={16} className="text-slate-300" />
            </div>
            <p className={`mt-4 font-bold text-slate-800 ${c.small ? "text-xl" : "text-3xl"}`}>
              {c.value}
            </p>
            <p className="text-sm text-slate-400">{c.label}</p>
          </div>
        ))}
      </div>

      {/* segunda linha de indicadores */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Em aberto (valor)" value={formatBRL(stats.openValue)} />
        <MiniStat label={`Perdidos em ${mShort}`} value={String(stats.lostThisMonth)} icon={<XCircle size={15} className="text-rose-400" />} onClick={() => navigate("/perdidos")} />
        <MiniStat label="Tarefas pendentes" value={String(stats.tasksPending)} icon={<CalendarClock size={15} className="text-sky-400" />} onClick={() => navigate("/agenda")} />
        <MiniStat label="Total de leads" value={String(stats.total)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* funil */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Negociações em andamento por etapa
          </h2>
          <div className="space-y-4">
            {STAGE_ORDER.map((s) => {
              const v = stats.byStage[s] ?? 0;
              return (
                <div key={s}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className={`h-2 w-2 rounded-full ${STAGE_META[s].dot}`} />
                      {STAGE_META[s].label}
                    </span>
                    <span className="text-slate-400">{v}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full ${STAGE_META[s].dot}`} style={{ width: `${(v / maxStage) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* leads por mes */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            Leads por mês
          </h2>
          {last6.length === 0 ? (
            <p className="text-sm text-slate-400">Sem dados ainda.</p>
          ) : (
            <div className="flex h-40 items-end justify-between gap-2">
              {last6.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-brand-400"
                      style={{ height: `${(m.count / maxMonthly) * 100}%` }}
                      title={`${m.count} leads`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">{monthLabel(m.month)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ranking de vendedores (admin, visao geral) */}
      {isAdmin && !ownerFilter && stats.perSeller.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Trophy size={16} className="text-amber-500" /> Desempenho por vendedor
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr>
                  <th className="py-2 font-medium">Vendedor</th>
                  <th className="py-2 font-medium">Leads</th>
                  <th className="py-2 font-medium">Em aberto</th>
                  <th className="py-2 font-medium">Vendas</th>
                  <th className="py-2 font-medium">Faturado</th>
                </tr>
              </thead>
              <tbody>
                {stats.perSeller.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer border-t border-slate-50 hover:bg-slate-50/60"
                    onClick={() => setOwnerFilter(s.id)}
                  >
                    <td className="py-2.5 font-medium text-slate-700">{s.name}</td>
                    <td className="py-2.5 text-slate-500">{s.total}</td>
                    <td className="py-2.5 text-slate-500">{s.abertos}</td>
                    <td className="py-2.5 text-slate-500">{s.vendas}</td>
                    <td className="py-2.5 font-semibold text-emerald-600">{formatBRL(s.faturado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* leads recentes */}
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Leads recentes</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.recent.map((lead: Lead) => (
            <button
              key={lead.id}
              onClick={() => navigate(`/leads/${lead.id}`)}
              className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{lead.name}</p>
                <p className="truncate text-xs text-slate-400">{lead.model || lead.email || lead.phone}</p>
              </div>
              {lead.value > 0 && (
                <span className="whitespace-nowrap text-xs font-semibold text-slate-600">
                  {formatBRL(lead.value)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm ${
        onClick ? "hover:bg-slate-50" : "cursor-default"
      }`}
    >
      <p className="flex items-center gap-1 text-xs text-slate-400">
        {icon} {label}
      </p>
      <p className="mt-1 text-lg font-bold text-slate-800">{value}</p>
    </button>
  );
}
