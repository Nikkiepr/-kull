"use client";
import Link from "next/link";
import { Bird, Menu } from "lucide-react";
import { useEffect, useState } from "react";

export type Role = "specialist" | "editor";

// shortcut: role lives in localStorage with no auth; add real login before production
export function useRole(): [Role, (r: Role) => void] {
  const [role, setRole] = useState<Role>("specialist");
  useEffect(() => {
    try { if (localStorage.getItem("role") === "editor") setRole("editor"); } catch {}
  }, []);
  return [role, (r) => { setRole(r); try { localStorage.setItem("role", r); } catch {} }];
}

export function Header({ role, setRole, onMenu }: { role: Role; setRole: (r: Role) => void; onMenu?: () => void }) {
  return (
    <header className="flex flex-wrap items-center gap-3 bg-[var(--harno)] px-4 py-3 text-white">
      {onMenu && (
        <button onClick={onMenu} className="md:hidden" aria-label="Ava ajalugu"><Menu size={22} /></button>
      )}
      <Link href="/" className="flex items-center gap-2 font-semibold"><Bird size={24} /> Öökull</Link>
      <span className="hidden text-sm text-white/70 sm:inline">Harno sisejuhendid ja regulatsioonid</span>
      <nav className="ml-auto flex items-center gap-3 text-sm">
        {role === "editor" && <Link href="/review" className="underline-offset-4 hover:underline">Ülevaatus</Link>}
        <label className="sr-only" htmlFor="role">Roll</label>
        <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded bg-white/10 px-2 py-1">
          <option value="specialist" className="text-black">Spetsialist</option>
          <option value="editor" className="text-black">Teavituste toimetaja</option>
        </select>
      </nav>
    </header>
  );
}
