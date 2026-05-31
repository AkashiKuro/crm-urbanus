import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Filter,
  CalendarCheck,
  RotateCcw,
  Users,
  CircleDot,
} from "lucide-react";
import { useAuth } from "../auth";

export default function Sidebar() {
  const { isAdmin } = useAuth();

  const nav = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/leads", label: "Funil de Vendas", icon: Filter },
    { to: "/agenda", label: "Agenda", icon: CalendarCheck },
    { to: "/perdidos", label: "Leads Perdidos", icon: RotateCcw },
    ...(isAdmin
      ? [{ to: "/vendedores", label: "Vendedores", icon: Users }]
      : []),
  ];

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-100 bg-white">
      <div className="flex h-16 items-center gap-2 px-6">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-white">
          <CircleDot size={18} />
        </span>
        <span className="text-lg font-bold tracking-tight">Urbanus CRM</span>
      </div>

      <nav className="space-y-1 px-3 py-2">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
              ].join(" ")
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
