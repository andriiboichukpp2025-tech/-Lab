import test from "node:test";
import assert from "node:assert/strict";
import builder from "../data/builder.json" assert { type: "json" };
import { calculateDrink } from "../js/modules/pricing.js";

test("calculates a latte with add-ons", () => {
  const result = calculateDrink({ baseId: "latte", sizeId: "m", milkId: "oat", syrups: ["vanilla"], extras: ["extra_shot"], quantity: 2 }, builder);
  assert.equal(result.ok, true);
  assert.equal(result.unitCents, 14200);
  assert.equal(result.totalCents, 28400);
});

test("rejects invalid quantity and too many extras", () => {
  const result = calculateDrink({ baseId: "latte", sizeId: "m", milkId: "cow", syrups: [], extras: ["extra_shot", "cinnamon", "marshmallow", "whipped_cream"], quantity: 2.5 }, builder);
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 2);
});

test("rejects milk for espresso", () => {
  const result = calculateDrink({ baseId: "espresso", sizeId: "s", milkId: "oat", syrups: [], extras: [], quantity: 1 }, builder);
  assert.equal(result.ok, false);
});
