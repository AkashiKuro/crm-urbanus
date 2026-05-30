import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Contact,
  Target,
  Calendar,
  Activity,
  BarChart3,
  CircleDot,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/accounts", label: "Accounts", icon: Users },
  { to: "/contacts", label: "Contacts", icon: Contact },
  { to: "/leads", label: "Leads", icon: Target },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/activities", label: "Activities", icon: Activity },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-100 flex flex-col">
      <div className="h-16 flex items-center gap-2 px-6">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-white">
          <CircleDot size={18} />
        </span>
        <span className="text-xl font-bold tracking-tight">CRM</span>
      </div>

      <nav className="px-3 py-2 space-y-1">
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
