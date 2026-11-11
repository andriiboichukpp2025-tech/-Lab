const CHAIR_SIZE = 40;
const BAR_CHAIR_SIZE = 36;
const SIDE_GAP = 12;

function tableSize(table) {
  return table.shape === "circle"
    ? { width: table.size.diameter, height: table.size.diameter }
    : table.size;
}

function sidePositions(table, side, count) {
  const size = tableSize(table);
  if (table.id.startsWith("WB") && side === "east") side = "west";
  const spacing = table.id === "H3" && count === 2 ? 240 : (side === "north" || side === "south" ? size.width / Math.max(count, 2) : size.height / Math.max(count, 2));
  const offset = count === 1 ? 0 : (count - 1) / 2;
  return Array.from({ length: count }, (_, index) => {
    const along = (index - offset) * spacing;
    const center = { x: table.x, y: table.y };
    if (side === "north") return { x: center.x + along, y: center.y - size.height / 2 - SIDE_GAP - CHAIR_SIZE / 2 };
    if (side === "south") return { x: center.x + along, y: center.y + size.height / 2 + SIDE_GAP + CHAIR_SIZE / 2 };
    if (side === "west") return { x: center.x - size.width / 2 - SIDE_GAP - CHAIR_SIZE / 2, y: center.y + along };
    return { x: center.x + size.width / 2 + SIDE_GAP + CHAIR_SIZE / 2, y: center.y + along };
  });
}

export function buildChairs(table) {
  const chairSize = table.id.startsWith("B") || table.id.startsWith("WB") ? BAR_CHAIR_SIZE : CHAIR_SIZE;
  const chairs = [];
  Object.entries(table.chairSides || {}).forEach(([side, count]) => {
    sidePositions({ ...table, size: table.id.startsWith("B") || table.id.startsWith("WB") ? { diameter: 36 } : table.size }, side, count).forEach((position, index) => {
      chairs.push({ id: `${table.id}-chair-${side}-${index + 1}`, tableId: table.id, side, x: position.x, y: position.y, width: chairSize, height: chairSize });
    });
  });
  return chairs;
}

export function getFurnitureRects(layout) {
  const tables = layout.tables.flatMap((table) => {
    const size = tableSize(table);
    return [{ id: table.id, kind: "table", tableId: table.id, x: table.x - size.width / 2, y: table.y - size.height / 2, width: size.width, height: size.height }, ...buildChairs(table).map((chair) => ({ ...chair, kind: "chair", x: chair.x - chair.width / 2, y: chair.y - chair.height / 2 }))];
  });
  return [...(layout.fixed || []), ...tables];
}

export function findOverlaps(rects) {
  const overlaps = [];
  for (let index = 0; index < rects.length; index += 1) {
    for (let next = index + 1; next < rects.length; next += 1) {
      const a = rects[index];
      const b = rects[next];
      if (a.tableId && a.tableId === b.tableId) continue;
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) overlaps.push([a, b]);
    }
  }
  return overlaps;
}

export function clearance(a, b) {
  const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0);
  const dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0);
  return Math.hypot(dx, dy);
}
