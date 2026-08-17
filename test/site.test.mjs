import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`https://lootforge.example${pathname}`, {
      headers: {
        accept: "text/html",
        host: "lootforge.example",
        "x-forwarded-host": "lootforge.example",
        "x-forwarded-proto": "https",
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the playable Lootforge shell without an auth redirect", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Lootforge — Procedural Rogue-RPG<\/title>/i);
  assert.match(html, /<h1>Lootforge<\/h1>/i);
  assert.match(html, /id="attackButton"/);
  assert.match(html, /id="autoMode"/);
  assert.match(html, /https:\/\/lootforge\.example\/og\.png/);
  assert.doesNotMatch(html, /signin-with-chatgpt|codex-preview/i);
});
