import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Search, Frown } from "lucide-react";
import { api } from "../api";
import type { Lead } from "../types";
import { formatBRL } from "../types";

export default function LostLeads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      setLeads(await api.listLeads("perdido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function recover(id: number) {
    await api.reactivateLead(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(q.toLowerCase()) ||
      (l.model || "").toLowerCase().includes(q.toLowerCase()) ||
      (l.loss_reason || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Leads Perdidos</h1>
        <p className="text-sm text-slate-400">
          Nada se perde — recupere um lead para colocá-lo de volta no funil.
        </p>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, modelo ou motivo..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <Frown className="mb-2 text-slate-300" size={32} />
          <p className="text-sm font-medium text-slate-500">
            Nenhum lead perdido {q && "para essa busca"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Motivo da perda</th>
                <th className="px-4 py-3 font-medium">Perdido em</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                >
                  <td
                    className="cursor-pointer px-4 py-3 font-medium text-slate-700"
                    onClick={() => navigate(`/leads/${l.id}`)}
                  >
                    {l.name}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{l.model || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {l.value > 0 ? formatBRL(l.value) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs text-rose-600">
                      {l.loss_reason || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {l.closed_at
                      ? new Date(l.closed_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => recover(l.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                    >
                      <RotateCcw size={13} /> Recuperar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
