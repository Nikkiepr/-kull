import mammoth from "mammoth";
// direct lib import avoids pdf-parse's debug-mode test-file read
import pdf from "pdf-parse/lib/pdf-parse.js";
import { chunkBlocks, type Block } from "./chunk";
import { prisma } from "./db";

async function pdfBlocks(buf: Buffer): Promise<Block[]> {
  const pages: string[] = [];
  await pdf(buf, {
    // pages are rendered sequentially, so push order == page order
    pagerender: async (pageData: { getTextContent: () => Promise<{ items: { str: string; hasEOL?: boolean }[] }> }) => {
      const c = await pageData.getTextContent();
      const t = c.items.map((i) => i.str + (i.hasEOL ? "\n" : " ")).join("");
      pages.push(t);
      return t;
    },
  });
  return pages.map((text, i) => ({ page: i + 1, section: null, text }));
}

async function docxBlocks(buf: Buffer): Promise<Block[]> {
  const { value: html } = await mammoth.convertToHtml({ buffer: buf });
  const blocks: Block[] = [];
  let section: string | null = null;
  for (const m of html.matchAll(/<(h[1-6]|p|li|td)[^>]*>([\s\S]*?)<\/\1>/g)) {
    const text = m[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
    if (!text) continue;
    if (m[1].startsWith("h")) { section = text; blocks.push({ page: null, section, text: "" }); continue; }
    const last = blocks.at(-1);
    if (last && last.section === section) last.text += "\n\n" + text;
    else blocks.push({ page: null, section, text });
  }
  return blocks.filter((b) => b.text);
}

export async function ingestFile(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name;
  const ext = name.split(".").pop()?.toLowerCase();
  let blocks: Block[];
  if (ext === "pdf") blocks = await pdfBlocks(buf);
  else if (ext === "docx") blocks = await docxBlocks(buf);
  else if (ext === "txt" || ext === "md") blocks = [{ page: null, section: null, text: buf.toString("utf8") }];
  else throw new Error("Toetatud on PDF, DOCX, TXT ja MD failid");

  const chunks = chunkBlocks(blocks);
  if (!chunks.length) throw new Error("Failist ei õnnestunud teksti lugeda (skannitud PDF?)");
  return prisma.document.create({
    data: { title: name.replace(/\.[^.]+$/, ""), filename: name, type: ext!, chunks: { create: chunks } },
    include: { _count: { select: { chunks: true } } },
  });
}
