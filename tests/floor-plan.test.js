import test from "node:test";
import assert from "node:assert/strict";
import tablesData from "../data/tables.json" assert { type: "json" };
import { buildChairs, clearance, findOverlaps, getFurnitureRects } from "../js/modules/floor-plan.js";

const tables = tablesData.tables;

test("floor plan has 18 unique tables and 41 seats", () => {
  assert.equal(new Set(tables.map((table) => table.id)).size, 18);
  assert.equal(tables.reduce((sum, table) => sum + table.seats, 0), 41);
  tables.forEach((table) => assert.equal(buildChairs(table).length, table.seats, table.id));
});

test("tables and chairs stay inside the 1200 by 800 room", () => {
  getFurnitureRects({ tables }).forEach((rect) => {
    assert.ok(rect.x >= 0 && rect.y >= 0, `${rect.id} starts outside`);
    assert.ok(rect.x + rect.width <= 1200 && rect.y + rect.height <= 800, `${rect.id} ends outside`);
  });
});

test("different table groups do not overlap", () => {
  const rects = getFurnitureRects({ tables }).filter((rect) => rect.tableId);
  assert.deepEqual(findOverlaps(rects), []);
});

test("chairs and tables of different groups have the required clearance", () => {
  const rects = getFurnitureRects({ tables }).filter((rect) => rect.tableId);
  for (const chair of rects.filter((rect) => rect.kind === "chair")) {
    for (const table of rects.filter((rect) => rect.kind === "table" && rect.tableId !== chair.tableId)) {
      const minimum = chair.tableId.startsWith("B") || chair.tableId.startsWith("WB") ? 20 : 50;
      assert.ok(clearance(chair, table) >= minimum, `${chair.id} is too close to ${table.id}`);
    }
  }
});

test("entry passage remains free", () => {
  const passage = { x: 600, y: 260, width: 160, height: 520 };
  const rects = getFurnitureRects({ tables }).filter((rect) => rect.tableId);
  assert.deepEqual(findOverlaps([passage, ...rects]).filter(([a, b]) => a === passage || b === passage), []);
});
