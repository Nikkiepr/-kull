export type RawChunk = { page: number | null; section: string | null; text: string };
export type Block = { page: number | null; section: string | null; text: string };

const MAX = 1000;

/** Split blocks (pages or sections) into ~MAX-char chunks on paragraph/sentence boundaries. */
export function chunkBlocks(blocks: Block[]): RawChunk[] {
  const out: RawChunk[] = [];
  for (const b of blocks) {
    const parts = b.text.replace(/\r/g, "").split(/\n{2,}|(?<=[.!?])\s+/);
    let buf = "";
    for (const p of parts.map((s) => s.trim()).filter(Boolean)) {
      if (buf && buf.length + p.length + 1 > MAX) {
        out.push({ page: b.page, section: b.section, text: buf });
        buf = "";
      }
      buf = buf ? `${buf} ${p}` : p;
      while (buf.length > MAX * 1.5) {
        out.push({ page: b.page, section: b.section, text: buf.slice(0, MAX) });
        buf = buf.slice(MAX);
      }
    }
    if (buf) out.push({ page: b.page, section: b.section, text: buf });
  }
  return out;
}

/** Turn a natural-language question into a prefix OR tsquery (crude Estonian stemming: first 5 chars). */
export function toTsQuery(q: string): string {
  const toks = (q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((t) => t.length > 2);
  return [...new Set(toks.map((t) => t.slice(0, 5)))].map((t) => `${t}:*`).join(" | ");
}
