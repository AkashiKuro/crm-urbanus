import { useState } from "react";
import { X, ThumbsUp, ThumbsDown } from "lucide-react";
import type { Lead } from "../types";
import { formatBRL } from "../types";

interface Props {
  lead: Lead;
  type: "won" | "lost";
  onClose: () => void;
  onConfirmWon: (value: number) => Promise<void>;
  onConfirmLost: (reason: string) => Promise<void>;
}

const LOSS_REASONS = [
  "Sem retorno / não respondeu",
  "Comprou com concorrente",
  "Preço / sem orçamento",
  "Não tinha perfil",
  "Desistiu da compra",
  "Outro",
];

export default function OutcomeModal({
  lead,
  type,
  onClose,
  onConfirmWon,
  onConfirmLost,
}: Props) {
  const [value, setValue] = useState(lead.value || 0);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setSaving(true);
    setError("");
    try {
      if (type === "won") {
        await onConfirmWon(value);
      } else {
        if (!reason.trim()) {
          setError("Selecione ou escreva o motivo da perda.");
          setSaving(false);
          return;
        }
        await onConfirmLost(reason.trim());
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  const won = type === "won";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {won ? (
              <ThumbsUp className="text-emerald-500" size={20} />
            ) : (
              <ThumbsDown className="text-rose-500" size={20} />
            )}
            {won ? "Marcar venda" : "Marcar perda"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          {won ? "Confirmar venda de" : "Marcar como perdido:"}{" "}
          <span className="font-medium text-slate-700">{lead.name}</span>
        </p>

        {won ? (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Valor da venda (R$)
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="input"
            />
            <span className="mt-1 block text-xs text-slate-400">
              {formatBRL(value)}
            </span>
          </label>
        ) : (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-500">
              Motivo da perda
            </span>
            {LOSS_REASONS.map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name="reason"
                  checked={reason === r}
                  onChange={() => setReason(r)}
                />
                {r}
              </label>
            ))}
            {reason === "Outro" && (
              <input
                autoFocus
                placeholder="Descreva o motivo"
                onChange={(e) => setReason(e.target.value)}
                className="input"
              />
            )}
            <p className="text-xs text-slate-400">
              O lead não será apagado — fica salvo em "Leads Perdidos" para você
              recuperar depois.
            </p>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={confirm}
            disabled={saving}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
              won ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"
            }`}
          >
            {saving ? "Salvando..." : won ? "Confirmar venda" : "Confirmar perda"}
          </button>
        </div>
      </div>
    </div>
  );
}
