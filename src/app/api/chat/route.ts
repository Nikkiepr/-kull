import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { search } from "@/lib/search";
import { MODELS, PROMPTS, type PromptKey } from "@/lib/prompts";

export const runtime = "nodejs";


export async function POST(req: Request) {
  const { conversationId, message, model, promptKey } = await req.json();
  if (typeof message !== "string" || !message.trim()) return Response.json({ error: "Küsimus puudub" }, { status: 400 });
  if (!MODELS.some((m) => m.id === model) || !(promptKey in PROMPTS)) return Response.json({ error: "Vale mudel või prompt" }, { status: 400 });

  const conv = conversationId
    ? await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId }, include: { messages: { orderBy: { createdAt: "asc" } } } })
    : await prisma.conversation.create({ data: { title: message.slice(0, 60), model, systemPromptKey: promptKey }, include: { messages: true } });

  await prisma.message.create({ data: { conversationId: conv.id, role: "user", content: message } });

  const hits = await search(message);
  const context = hits.length
    ? hits.map((h, i) => `[${i + 1}] ${h.title}${h.page ? `, lk ${h.page}` : ""}${h.section ? `, jaotis "${h.section}"` : ""}\n${h.text}`).join("\n\n")
    : "(Ühtegi asjakohast väljavõtet ei leitud.)";

  const history = conv.messages.slice(-6).map((m) => ({ role: m.role as "user" | "assistant", content: m.editedContent ?? m.content }));
  const res = await new Anthropic().messages.create({
    model,
    max_tokens: 1500,
    system: PROMPTS[promptKey as PromptKey].text,
    messages: [...history, { role: "user", content: `Dokumentide väljavõtted:\n\n${context}\n\nKüsimus: ${message}` }],
  });
  const answer = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");

  const used = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  const citations = hits.map((h, i) => ({ n: i + 1, ...h })).filter((c) => used.has(c.n));
  const notFound = answer.includes("Dokumentidest vastust ei leitud");

  const saved = await prisma.message.create({
    data: {
      conversationId: conv.id,
      role: "assistant",
      content: answer,
      citations,
      uncited: !notFound && citations.length === 0,
      reviewStatus: promptKey === "notice" ? "PENDING" : null,
    },
  });
  return Response.json({ conversationId: conv.id, message: saved });
}
