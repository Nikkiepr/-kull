import { prisma } from "./db";
import { toTsQuery } from "./chunk";

export type Hit = { id: string; documentId: string; title: string; page: number | null; section: string | null; text: string };

export async function search(q: string, limit = 8): Promise<Hit[]> {
  const tsq = toTsQuery(q);
  if (!tsq) return [];
  return prisma.$queryRaw<Hit[]>`
    SELECT c."id", c."documentId", d."title", c."page", c."section", c."text"
    FROM "Chunk" c JOIN "Document" d ON d."id" = c."documentId"
    WHERE c."tsv" @@ to_tsquery('simple', ${tsq})
    ORDER BY ts_rank(c."tsv", to_tsquery('simple', ${tsq})) DESC
    LIMIT ${limit}`;
}
