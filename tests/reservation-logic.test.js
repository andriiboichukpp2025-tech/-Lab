import test from "node:test";
import assert from "node:assert/strict";
import { intervalsOverlap, isSeededBusy, validateReservation } from "../js/modules/reservation-logic.js";

test("seeded availability is deterministic", () => {
  assert.equal(isSeededBusy("W1", "2026-11-12", "10:00"), isSeededBusy("W1", "2026-11-12", "10:00"));
});

test("detects overlapping reservation intervals", () => {
  assert.equal(intervalsOverlap("2026-11-12T10:00:00", 90, "2026-11-12T11:00:00", 60), true);
  assert.equal(intervalsOverlap("2026-11-12T10:00:00", 60, "2026-11-12T11:00:00", 60), false);
});

test("rejects invalid reservation values", () => {
  const errors = validateReservation({ date: "2020-01-01", time: "08:00", duration: 120, guests: 9 }, new Date("2026-11-10T12:00:00"));
  assert.ok(errors.length >= 3);
});
