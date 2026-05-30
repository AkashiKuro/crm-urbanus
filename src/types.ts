export type LeadStatus = "new" | "open" | "in_progress" | "open_deal";

export type LeadTag = "in_process" | "dead" | "recycled";

export interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string;
  source: string;
  status: LeadStatus;
  tag: LeadTag;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const STATUS_META: Record<
  LeadStatus,
  { label: string; dot: string }
> = {
  new: { label: "New", dot: "bg-orange-400" },
  open: { label: "Open", dot: "bg-blue-500" },
  in_progress: { label: "In Progress", dot: "bg-yellow-400" },
  open_deal: { label: "Open deal", dot: "bg-sky-400" },
};

export const TAG_META: Record<
  LeadTag,
  { label: string; className: string }
> = {
  in_process: {
    label: "In Process",
    className: "bg-orange-50 text-orange-600",
  },
  dead: { label: "Dead", className: "bg-rose-50 text-rose-600" },
  recycled: { label: "Recycled", className: "bg-cyan-50 text-cyan-600" },
};

export const STATUS_ORDER: LeadStatus[] = [
  "new",
  "open",
  "in_progress",
  "open_deal",
];
