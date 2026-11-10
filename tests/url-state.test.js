import test from "node:test";
import assert from "node:assert/strict";
import builder from "../data/builder.json" assert { type: "json" };
import { configureUrlState, parseBuilderUrl, serializeBuilderUrl } from "../js/modules/url-state.js";

configureUrlState(builder);

test("parses allowed builder URL state", () => {
  const state = parseBuilderUrl("?b=latte&s=m&m=oat&sy=vanilla:1,caramel:2&ex=extra_shot&q=2");
  assert.deepEqual(state.syrups, ["vanilla", "caramel", "caramel"]);
  assert.equal(state.quantity, 2);
});

test("ignores invalid URL values", () => {
  const state = parseBuilderUrl("?b=<script>&s=x&sy=unknown:4&q=100");
  assert.equal(state.baseId, null);
  assert.deepEqual(state.syrups, []);
  assert.equal(state.quantity, 1);
});

test("serializes a safe state", () => {
  const query = serializeBuilderUrl({ baseId: "latte", sizeId: "m", milkId: "oat", syrups: ["vanilla", "vanilla"], extras: ["extra_shot"], quantity: 2 });
  assert.equal(query, "?b=latte&s=m&m=oat&sy=vanilla%3A2&ex=extra_shot&q=2");
});
