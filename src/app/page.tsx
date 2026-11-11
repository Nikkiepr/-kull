"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, MessageSquarePlus, Paperclip, Send, Trash2, XCircle } from "lucide-react";
import { Header, useRole } from "./Header";
import { Citations, type Citation } from "./Citations";
import { MODELS, PROMPTS, type PromptKey } from "@/lib/prompts";

type Msg = {
  id: string; role: string; content: string; citations: Citation[] | null; uncited: boolean;
  reviewStatus: "PENDING" | "APPROVED" | "REJECTED" | null; reviewerNote: string | null; editedContent: string | null;
};
type ConvSummary = { id: string; title: string };

const STATUS = {
  PENDING: { icon: Clock, text: "Ootab ülevaatust", cls: "text-amber-700 bg-amber-50" },
  APPROVED: { icon: CheckCircle2, text: "Kinnitatud", cls: "text-green-700 bg-green-50" },
  REJECTED: { icon: XCircle, text: "Tagasi lükatud", cls: "text-red-700 bg-red-50" },
};

export default function Home() {
  const [role, setRole] = useRole();
  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(MODELS[0].id);
  const [promptKey, setPromptKey] = useState<PromptKey>("general");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadConvs = () => fetch("/api/conversations").then((r) => r.json()).then((d) => Array.isArray(d) && setConvs(d)).catch(() => {});
  useEffect(() => { loadConvs(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  async function openConv(id: string) {
    setSidebar(false);
    const c = await fetch(`/api/conversations?id=${id}`).then((r) => r.json());
    setConvId(c.id); setMsgs(c.messages); setModel(c.model); setPromptKey(c.systemPromptKey);
  }

  async function removeConv(id: string) {
    if (!confirm("Kustutada see vestlus?")) return;
    await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
    if (id === convId) { setConvId(null); setMsgs([]); }
    loadConvs();
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setInput(""); setBusy(true); setNotice(null);
    setMsgs((m) => [...m, { id: "tmp", role: "user", content: q, citations: null, uncited: false, reviewStatus: null, reviewerNote: null, editedContent: null }]);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: convId, message: q, model, promptKey }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Viga vastuse saamisel");
      const d = await r.json();
      setMsgs((m) => [...m, d.message]);
      if (!convId) { setConvId(d.conversationId); loadConvs(); }
    } catch (err) {
      setNotice((err as Error).message); setInput(q);
      setMsgs((m) => m.filter((x) => x.id !== "tmp"));
    } finally { setBusy(false); }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append("file", f));
    setNotice("Laen dokumente üles…");
    const res = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => [{ error: "Üleslaadimine ebaõnnestus" }]);
    setNotice(res.map((x: { filename?: string; chunks?: number; error?: string }) => x.error ? `${x.filename ?? ""}: ${x.error}` : `${x.filename}: ${x.chunks} lõiku indekseeritud`).join(" · "));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submitReview(id: string) {
    const m = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "submit" }) }).then((r) => r.json());
    setMsgs((ms) => ms.map((x) => (x.id === id ? { ...x, reviewStatus: m.reviewStatus } : x)));
  }

  return (
    <div className="flex h-dvh flex-col">
      <Header role={role} setRole={setRole} onMenu={() => setSidebar((s) => !s)} />
      <div className="relative flex min-h-0 flex-1">
        <aside className={`${sidebar ? "flex" : "hidden"} absolute inset-y-0 left-0 z-10 w-72 flex-col border-r border-slate-200 bg-white md:static md:flex`}>
          <button onClick={() => { setConvId(null); setMsgs([]); setSidebar(false); }} className="m-3 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            <MessageSquarePlus size={16} /> Uus vestlus
          </button>
          <div className="px-3 pb-1 text-xs font-semibold uppercase text-slate-500">Ajalugu</div>
          <ul className="flex-1 overflow-y-auto px-2 pb-3">
            {convs.map((c) => (
              <li key={c.id} className={`group flex items-center rounded-lg text-sm ${c.id === convId ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                <button onClick={() => openConv(c.id)} className="flex-1 truncate px-2 py-2 text-left">{c.title}</button>
                <button onClick={() => removeConv(c.id)} aria-label="Kustuta vestlus" className="p-2 text-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-2 text-sm">
            <label className="flex items-center gap-1">Mudel
              <select value={model} onChange={(e) => setModel(e.target.value)} className="rounded border border-slate-300 px-2 py-1">
                {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1">Režiim
              <select value={promptKey} onChange={(e) => setPromptKey(e.target.value as PromptKey)} className="rounded border border-slate-300 px-2 py-1">
                {Object.entries(PROMPTS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
              </select>
            </label>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-3xl space-y-4">
              {!msgs.length && (
                <div className="py-16 text-center text-slate-500">
                  <p className="text-lg font-medium text-slate-700">Tere! Mina olen Öökull.</p>
                  <p>Küsi Harno sisejuhendite, eksamikorra või e-hindamise kohta. Iga vastus viitab dokumendile ja leheküljele.</p>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={m.id + i} className={m.role === "user" ? "flex justify-end" : ""}>
                  <div className={m.role === "user" ? "max-w-[85%] rounded-2xl bg-[var(--harno)] px-4 py-2 text-white" : "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"}>
                    <p className="whitespace-pre-wrap">{m.editedContent ?? m.content}</p>
                    {m.role === "assistant" && (
                      <>
                        {m.uncited && <p className="mt-2 flex items-center gap-1 text-sm text-amber-700"><AlertTriangle size={14} /> Vastusel puuduvad viited – kontrolli enne kasutamist.</p>}
                        <Citations items={m.citations ?? []} />
                        <div className="mt-3 flex items-center gap-2 text-xs">
                          {m.reviewStatus ? (() => { const s = STATUS[m.reviewStatus]; return <span className={`flex items-center gap-1 rounded px-2 py-1 ${s.cls}`}><s.icon size={12} /> {s.text}</span>; })()
                            : <button onClick={() => submitReview(m.id)} className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50">Saada ülevaatusele</button>}
                          {m.reviewerNote && <span className="text-slate-500">Toimetaja: {m.reviewerNote}</span>}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {busy && <div className="flex items-center gap-2 text-slate-500"><Loader2 className="animate-spin" size={16} /> Otsin dokumentidest…</div>}
              <div ref={endRef} />
            </div>
          </div>

          {notice && <div role="status" className="mx-auto w-full max-w-3xl px-4 text-sm text-slate-600">{notice}</div>}
          <form onSubmit={send} className="mx-auto flex w-full max-w-3xl items-end gap-2 p-4">
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" multiple hidden onChange={(e) => upload(e.target.files)} />
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Lisa dokument" className="rounded-lg border border-slate-300 bg-white p-2.5 hover:bg-slate-50"><Paperclip size={18} /></button>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Küsi midagi…" aria-label="Küsimus"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }}
              className="max-h-40 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-[var(--harno)]" />
            <button disabled={busy || !input.trim()} aria-label="Saada" className="rounded-lg bg-[var(--harno)] p-2.5 text-white disabled:opacity-40"><Send size={18} /></button>
          </form>
        </main>
      </div>
    </div>
  );
}
