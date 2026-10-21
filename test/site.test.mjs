import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";
import { createTestHarness } from "wrangler";

// Run the built Worker in workerd so Cloudflare imports and asset bindings
// are exercised with the same configuration used for deployment.
const server = createTestHarness({
  workers: [
    {
      configPath: fileURLToPath(
        new URL("../dist/server/wrangler.json", import.meta.url),
      ),
    },
  ],
});
before(() => server.listen());
after(() => server.close());

async function render(pathname = "/") {
  return server.fetch(`https://lootforge.example${pathname}`, {
    headers: {
      accept: "text/html",
      host: "lootforge.example",
      "x-forwarded-host": "lootforge.example",
      "x-forwarded-proto": "https",
    },
  });
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

test("serves the social image from the built assets", async () => {
  const response = await server.fetch("https://lootforge.example/og.png");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^image\/png\b/i);
  assert.ok((await response.arrayBuffer()).byteLength > 0);
});

test("rejects remote image optimization without an allowed remote pattern", async () => {
  const response = await server.fetch(
    "https://lootforge.example/_vinext/image?url=https%3A%2F%2Fexample.com%2Fimage.png&w=640&q=75",
  );
  assert.equal(response.status, 400);
});
