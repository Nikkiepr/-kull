import { FileText } from "lucide-react";

export type Citation = { n: number; title: string; page: number | null; section: string | null; text: string };

export function Citations({ items }: { items: Citation[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Allikad</div>
      {items.map((c) => (
        <details key={c.n} id={`cite-${c.n}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
          <summary className="flex cursor-pointer items-start gap-2">
            <span className="rounded bg-[var(--harno)] px-1.5 text-xs font-bold text-white">{c.n}</span>
            <FileText size={16} className="mt-0.5 shrink-0 text-slate-500" />
            <span>
              <b>{c.title}</b>
              {c.page && <> · lk {c.page}</>}
              {c.section && <> · {c.section}</>}
            </span>
          </summary>
          <p className="mt-2 whitespace-pre-wrap border-l-2 border-slate-300 pl-3 text-slate-600">{c.text}</p>
        </details>
      ))}
    </div>
  );
}
