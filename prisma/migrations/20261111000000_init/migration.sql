CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "page" INTEGER,
    "section" TEXT,
    "text" TEXT NOT NULL,
    "tsv" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce("section", '') || ' ' || "text")) STORED
);
CREATE INDEX "Chunk_documentId_idx" ON "Chunk"("documentId");
CREATE INDEX "Chunk_tsv_idx" ON "Chunk" USING GIN ("tsv");

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "systemPromptKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "uncited" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" "ReviewStatus",
    "reviewerNote" TEXT,
    "editedContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX "Message_reviewStatus_idx" ON "Message"("reviewStatus");
