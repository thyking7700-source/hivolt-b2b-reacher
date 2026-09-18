import assert from "node:assert/strict";
import test from "node:test";

import { shouldRejectDevRequest } from "./dev-request-guard.mjs";

test("rejects sensitive files before Vite import analysis", () => {
  assert.equal(shouldRejectDevRequest("/.git/index"), true);
  assert.equal(shouldRejectDevRequest("/%2egit/index"), true);
  assert.equal(shouldRejectDevRequest("/.env?raw"), true);
  assert.equal(shouldRejectDevRequest("/public/.aws/credentials"), true);
  assert.equal(shouldRejectDevRequest("/public/index.php"), true);
});

test("allows application and platform routes", () => {
  assert.equal(shouldRejectDevRequest("/"), false);
  assert.equal(shouldRejectDevRequest("/src/router.tsx"), false);
  assert.equal(shouldRejectDevRequest("/__grok/manifest.webmanifest"), false);
  assert.equal(shouldRejectDevRequest("/node_modules/.vite/deps/react.js?v=123"), false);
  assert.equal(shouldRejectDevRequest("/node_modules/.vite/deps/react-dom_client.js?v=123"), false);
  assert.equal(shouldRejectDevRequest("/.well-known/appspecific/com.chrome.devtools.json"), false);
});

test("rejects malformed URL encoding", () => {
  assert.equal(shouldRejectDevRequest("/%E0%A4%A"), true);
});