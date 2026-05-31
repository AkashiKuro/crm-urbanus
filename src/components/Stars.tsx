import { Star } from "lucide-react";

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}

// Qualificacao por estrelas (1..5). Se onChange vier, fica clicavel.
export default function Stars({ value, onChange, size = 14 }: Props) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return onChange ? (
          <button
            key={n}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(n);
            }}
            className="text-amber-400 hover:scale-110 transition"
          >
            <Star
              size={size}
              className={filled ? "fill-amber-400" : "fill-transparent text-slate-300"}
            />
          </button>
        ) : (
          <Star
            key={n}
            size={size}
            className={`text-amber-400 ${
              filled ? "fill-amber-400" : "fill-transparent text-slate-300"
            }`}
          />
        );
      })}
    </span>
  );
}
