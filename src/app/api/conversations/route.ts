import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const conv = await prisma.conversation.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    return conv ? Response.json(conv) : Response.json({ error: "Ei leitud" }, { status: 404 });
  }
  return Response.json(await prisma.conversation.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, createdAt: true } }));
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id puudub" }, { status: 400 });
  await prisma.conversation.delete({ where: { id } });
  return Response.json({ ok: true });
}
