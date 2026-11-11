import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkBlocks, toTsQuery } from "./chunk.ts";

test("chunks keep page and stay bounded", () => {
  const text = Array.from({ length: 50 }, (_, i) => `Lause number ${i} on siin.`).join(" ");
  const chunks = chunkBlocks([{ page: 3, section: null, text }, { page: 4, section: null, text: "Lühike." }]);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((c) => c.text.length <= 1500));
  assert.equal(chunks.at(-1)!.page, 4);
  assert.equal(chunks[0].page, 3);
});

test("tsquery is sanitized prefix OR", () => {
  assert.equal(toTsQuery("Kuidas eksamile registreeruda? ');DROP"), "kuida:* | eksam:* | regis:* | drop:*");
  assert.equal(toTsQuery("a ?"), "");
});
