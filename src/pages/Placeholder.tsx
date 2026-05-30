import { Construction } from "lucide-react";

export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{title}</h1>
      <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
        <Construction className="mb-3 text-slate-300" size={32} />
        <p className="text-sm font-medium text-slate-500">
          Página "{title}" em construção
        </p>
        <p className="text-xs text-slate-400">
          Em breve nesta área do CRM.
        </p>
      </div>
    </div>
  );
}
