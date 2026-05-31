import { useState } from "react";
import { Bell, ChevronDown, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { useAuth } from "../auth";

export default function Topbar() {
  const { user, logout, isAdmin } = useAuth();
  const [menu, setMenu] = useState(false);

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-100 bg-white px-6">
      <div className="ml-auto flex items-center gap-4">
        <button className="relative text-slate-400 hover:text-slate-600">
          <Bell size={20} />
        </button>
        <div className="h-6 w-px bg-slate-200" />
        <div className="relative">
          <button
            onClick={() => setMenu((v) => !v)}
            className="flex items-center gap-2"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-brand-700">
              {isAdmin ? <ShieldCheck size={16} /> : <UserIcon size={16} />}
            </span>
            <span className="text-left">
              <span className="block text-sm font-medium leading-tight text-slate-700">
                {user?.name}
              </span>
              <span className="block text-[11px] leading-tight text-slate-400">
                {isAdmin ? "Administrador" : "Vendedor"}
              </span>
            </span>
            <ChevronDown size={16} className="text-slate-400" />
          </button>

          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
                <div className="px-3 py-2 text-xs text-slate-400">{user?.email}</div>
                <div className="h-px bg-slate-100" />
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={15} /> Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
