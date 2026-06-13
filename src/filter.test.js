import { test } from "node:test";
import assert from "node:assert/strict";

import { shouldBlock } from "./filter.js";

test("allows ordinary messages", () => {
  assert.equal(shouldBlock("Just a normal update for the group", []), false);
});

test("blocks plain t.me links", () => {
  assert.equal(shouldBlock("Join here https://t.me/somechannel", []), true);
});

test("blocks bare t.me links without scheme", () => {
  assert.equal(shouldBlock("see t.me/joinchat/abc123", []), true);
});

test("blocks telegram.me links", () => {
  assert.equal(shouldBlock("visit telegram.me/foo", []), true);
});

test("blocks tg:// deep links", () => {
  assert.equal(shouldBlock("open tg://resolve?domain=foo", []), true);
});

test("blocks telegram links hidden behind text_link entities", () => {
  const entities = [
    { type: "text_link", offset: 0, length: 4, url: "https://t.me/secret" },
  ];
  assert.equal(shouldBlock("here", entities), true);
});

test("does not block non-telegram links", () => {
  assert.equal(shouldBlock("read https://example.com/article", []), false);
  const entities = [
    { type: "text_link", offset: 0, length: 4, url: "https://example.com" },
  ];
  assert.equal(shouldBlock("here", entities), false);
});

test("blocks the keyword розіграш", () => {
  assert.equal(shouldBlock("Великий розіграш призів!", []), true);
});

test("blocks розіграш case-insensitively and across declensions", () => {
  assert.equal(shouldBlock("УМОВИ РОЗІГРАШУ", []), true);
  assert.equal(shouldBlock("беріть участь у розіграші", []), true);
});

test("handles empty and missing text", () => {
  assert.equal(shouldBlock("", []), false);
  assert.equal(shouldBlock(undefined, undefined), false);
});
