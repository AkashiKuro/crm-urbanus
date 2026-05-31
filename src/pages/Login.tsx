import { useState } from "react";
import { CircleDot, LogIn } from "lucide-react";
import { useAuth } from "../auth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-full place-items-center bg-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-white">
            <CircleDot size={26} />
          </span>
          <h1 className="text-xl font-bold text-slate-800">Urbanus CRM</h1>
          <p className="text-sm text-slate-400">Entre com sua conta</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Email</span>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="seu@email.com"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            <LogIn size={16} />
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Acesso de teste — Admin: admin@urbanus.com / admin123 · Vendedor:
          vendedor@urbanus.com / vendedor123
        </p>
      </div>
    </div>
  );
}
