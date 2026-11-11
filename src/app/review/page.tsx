"use client";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Header, useRole } from "../Header";
import { Citations, type Citation } from "../Citations";

type Item = { id: string; content: string; editedContent: string | null; reviewerNote: string | null; citations: Citation[] | null; uncited: boolean; createdAt: string; conversation: { title: string } };
const TABS = { PENDING: "Ootel", APPROVED: "Kinnitatud", REJECTED: "Tagasi lükatud" } as const;

export default function Review() {
  const [role, setRole] = useRole();
  const [tab, setTab] = useState<keyof typeof TABS>("PENDING");
  const [items, setItems] = useState<Item[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { text: string; note: string }>>({});

  const load = () => fetch(`/api/review?status=${tab}`).then((r) => r.json()).then((d) => Array.isArray(d) && setItems(d)).catch(() => {});
  useEffect(() => { load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(id: string, action: "approve" | "reject") {
    const d = drafts[id];
    await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, note: d?.note, editedContent: d?.text }) });
    load();
  }

  return (
    <div className="min-h-dvh">
      <Header role={role} setRole={setRole} />
      <main className="mx-auto max-w-4xl p-4">
        <h1 className="mb-4 text-xl font-semibold">Vastuste ülevaatus</h1>
        {role !== "editor" && <p className="mb-4 rounded bg-amber-50 p-3 text-sm text-amber-800">Ülevaatus on mõeldud teavituste toimetajale. Vali päisest roll „Teavituste toimetaja“.</p>}
        <div role="tablist" className="mb-4 flex gap-2">
          {Object.entries(TABS).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k as keyof typeof TABS)}
              className={`rounded-full px-3 py-1 text-sm ${tab === k ? "bg-[var(--harno)] text-white" : "bg-white border border-slate-300"}`}>{label}</button>
          ))}
        </div>
        {!items.length && <p className="text-slate-500">Siin pole midagi.</p>}
        <div className="space-y-4">
          {items.map((it) => {
            const d = drafts[it.id] ?? { text: it.editedContent ?? it.content, note: it.reviewerNote ?? "" };
            const set = (p: Partial<typeof d>) => setDrafts((s) => ({ ...s, [it.id]: { ...d, ...p } }));
            return (
              <article key={it.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 text-sm text-slate-500">{it.conversation.title} · {new Date(it.createdAt).toLocaleString("et-EE")}</div>
                {it.uncited && <p className="mb-2 text-sm text-amber-700">⚠ Vastusel puuduvad viited.</p>}
                <label className="text-xs font-semibold text-slate-500" htmlFor={`t-${it.id}`}>Vastuse tekst (muudetav)</label>
                <textarea id={`t-${it.id}`} value={d.text} onChange={(e) => set({ text: e.target.value })} disabled={tab !== "PENDING"}
                  rows={6} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" />
                <Citations items={it.citations ?? []} />
                {tab === "PENDING" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder="Märkus (valikuline)" aria-label="Märkus" className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm" />
                    <button onClick={() => act(it.id, "approve")} className="flex items-center gap-1 rounded bg-green-700 px-3 py-1.5 text-sm text-white"><Check size={14} /> Kinnita</button>
                    <button onClick={() => act(it.id, "reject")} className="flex items-center gap-1 rounded bg-red-700 px-3 py-1.5 text-sm text-white"><X size={14} /> Lükka tagasi</button>
                  </div>
                ) : it.reviewerNote && <p className="mt-2 text-sm text-slate-600">Märkus: {it.reviewerNote}</p>}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
