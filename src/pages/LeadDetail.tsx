import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  Bike,
  CreditCard,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  RotateCcw,
  Send,
  UserCircle2,
} from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth";
import type { Lead, Interaction, User } from "../types";
import {
  STAGE_META,
  STAGE_ORDER,
  STATUS_META,
  formatBRL,
} from "../types";
import Stars from "../components/Stars";
import LeadModal from "../components/LeadModal";
import OutcomeModal from "../components/OutcomeModal";

const KIND_LABEL: Record<string, string> = {
  created: "Lead criado",
  note: "Anotação",
  stage: "Mudança de etapa",
  won: "Venda",
  lost: "Perda",
  reactivated: "Recuperado",
};

export default function LeadDetail() {
  const { id } = useParams();
  const leadId = Number(id);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [lead, setLead] = useState<Lead | null>(null);
  const [history, setHistory] = useState<Interaction[]>([]);
  const [sellers, setSellers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [outcome, setOutcome] = useState<"won" | "lost" | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [l, h] = await Promise.all([
        api.getLead(leadId),
        api.listInteractions(leadId),
      ]);
      setLead(l);
      setHistory(h);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  useEffect(() => {
    if (isAdmin) api.listUsers().then((us) => setSellers(us.filter((u) => u.active)));
  }, [isAdmin]);

  async function addNote() {
    if (!note.trim()) return;
    const created = await api.addInteraction(leadId, note.trim());
    setHistory((prev) => [created, ...prev]);
    setNote("");
  }

  async function changeStage(stage: Lead["stage"]) {
    if (!lead) return;
    const updated = await api.updateLead(leadId, { stage });
    setLead(updated);
    load();
  }

  if (loading) return <p className="text-sm text-slate-400">Carregando...</p>;
  if (!lead)
    return (
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-brand-600">
          ← Voltar
        </button>
        <p className="mt-4 text-sm text-slate-500">Lead não encontrado.</p>
      </div>
    );

  const st = STATUS_META[lead.status];

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{lead.name}</h1>
          <span className={`rounded-md px-2 py-1 text-xs font-medium ${st.className}`}>
            {st.label}
          </span>
          <Stars value={lead.rating} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Pencil size={15} /> Editar
          </button>
          {lead.status === "em_andamento" ? (
            <>
              <button onClick={() => setOutcome("lost")} className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100">
                <ThumbsDown size={15} /> Marcar perda
              </button>
              <button onClick={() => setOutcome("won")} className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600">
                <ThumbsUp size={15} /> Marcar venda
              </button>
            </>
          ) : (
            <button
              onClick={async () => {
                await api.reactivateLead(leadId);
                load();
              }}
              className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
            >
              <RotateCcw size={15} /> Recuperar lead
            </button>
          )}
        </div>
      </div>

      {/* trilha de etapas (so para em andamento) */}
      {lead.status === "em_andamento" && (
        <div className="mb-6 flex gap-1 overflow-x-auto">
          {STAGE_ORDER.map((s) => {
            const active = s === lead.stage;
            const passed = STAGE_ORDER.indexOf(s) <= STAGE_ORDER.indexOf(lead.stage);
            return (
              <button
                key={s}
                onClick={() => changeStage(s)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-brand-500 text-white"
                    : passed
                    ? "bg-brand-50 text-brand-600"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {STAGE_META[s].label}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* dados do lead */}
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Dados do cliente</h2>
          <InfoRow icon={<Phone size={15} />} label="Telefone" value={lead.phone} />
          <InfoRow icon={<Mail size={15} />} label="Email" value={lead.email} />
          <InfoRow icon={<Bike size={15} />} label="Modelo de interesse" value={lead.model} />
          <InfoRow icon={<CreditCard size={15} />} label="Forma de pagamento" value={lead.payment} />
          <InfoRow label="Valor" value={lead.value > 0 ? formatBRL(lead.value) : "—"} />
          <InfoRow label="Origem" value={lead.source} />
          <InfoRow icon={<UserCircle2 size={15} />} label="Responsável" value={lead.owner_name || "Sem responsável"} />
          {lead.status === "perdido" && (
            <InfoRow label="Motivo da perda" value={lead.loss_reason} danger />
          )}
          {lead.notes && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-400">Observações</p>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* historico de interacoes */}
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700">Histórico</h2>

          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNote()}
              placeholder="Escreva uma anotação..."
              className="input flex-1"
            />
            <button
              onClick={addNote}
              className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Send size={15} />
            </button>
          </div>

          <div className="space-y-3">
            {history.length === 0 && (
              <p className="text-sm text-slate-400">Nenhum registro ainda.</p>
            )}
            {history.map((h) => (
              <div key={h.id} className="flex gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">{h.content}</p>
                  <p className="text-xs text-slate-400">
                    {KIND_LABEL[h.kind] || h.kind} ·{" "}
                    {new Date(h.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editing && (
        <LeadModal
          lead={lead}
          sellers={isAdmin ? sellers : undefined}
          onClose={() => setEditing(false)}
          onSubmit={async (data) => {
            const updated = await api.updateLead(leadId, data);
            setLead(updated);
            load();
          }}
        />
      )}

      {outcome && (
        <OutcomeModal
          lead={lead}
          type={outcome}
          onClose={() => setOutcome(null)}
          onConfirmWon={async (value) => {
            const u = await api.markWon(leadId, value);
            setLead(u);
            load();
          }}
          onConfirmLost={async (reason) => {
            const u = await api.markLost(leadId, reason);
            setLead(u);
            load();
          }}
        />
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  danger,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 text-slate-400">{icon}</span>}
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`text-sm ${danger ? "text-rose-600" : "text-slate-700"}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}
