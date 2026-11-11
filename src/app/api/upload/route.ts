import { ingestFile } from "@/lib/ingest";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const docs = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, filename: true, createdAt: true, _count: { select: { chunks: true } } },
  });
  return Response.json(docs);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (!files.length) return Response.json({ error: "Fail puudub" }, { status: 400 });
  const results = [];
  for (const f of files) {
    if (f.size > 25 * 1024 * 1024) { results.push({ filename: f.name, error: "Fail on suurem kui 25 MB" }); continue; }
    try {
      const d = await ingestFile(f);
      results.push({ filename: f.name, id: d.id, chunks: d._count.chunks });
    } catch (e) {
      results.push({ filename: f.name, error: (e as Error).message });
    }
  }
  return Response.json(results);
}
