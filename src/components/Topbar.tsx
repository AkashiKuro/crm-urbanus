import { Search, Mail, Bell, ChevronDown } from "lucide-react";

export default function Topbar() {
  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-100 flex items-center gap-4 px-6">
      <div className="relative w-full max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search Anything..."
          className="w-full rounded-lg bg-slate-50 border border-slate-100 pl-9 pr-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      <div className="ml-auto flex items-center gap-4">
        <button className="text-slate-400 hover:text-slate-600">
          <Mail size={20} />
        </button>
        <button className="relative text-slate-400 hover:text-slate-600">
          <Bell size={20} />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500" />
        </button>
        <div className="h-6 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Hi, John Kuy</span>
          <img
            src="https://i.pravatar.cc/64?img=12"
            alt="avatar"
            className="h-8 w-8 rounded-full object-cover"
          />
          <ChevronDown size={16} className="text-slate-400" />
        </div>
      </div>
    </header>
  );
}
