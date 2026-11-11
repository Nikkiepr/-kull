import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status") ?? "PENDING";
  if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) return Response.json({ error: "Vale staatus" }, { status: 400 });
  const items = await prisma.message.findMany({
    where: { reviewStatus: status as "PENDING" },
    orderBy: { createdAt: "desc" },
    include: { conversation: { select: { title: true } } },
  });
  return Response.json(items);
}

// action: submit (specialist sends for review) | approve | reject
export async function POST(req: Request) {
  const { id, action, note, editedContent } = await req.json();
  const map = { submit: "PENDING", approve: "APPROVED", reject: "REJECTED" } as const;
  if (typeof id !== "string" || !(action in map)) return Response.json({ error: "Vale päring" }, { status: 400 });
  if (!(await prisma.message.findUnique({ where: { id }, select: { id: true } }))) return Response.json({ error: "Sõnumit ei leitud" }, { status: 404 });
  const msg = await prisma.message.update({
    where: { id },
    data: {
      reviewStatus: map[action as keyof typeof map],
      ...(typeof note === "string" && { reviewerNote: note }),
      ...(typeof editedContent === "string" && editedContent.trim() && { editedContent }),
    },
  });
  return Response.json(msg);
}
