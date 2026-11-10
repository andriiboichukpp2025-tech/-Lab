const MAX_SYRUPS = 3;
const MAX_EXTRAS = 3;
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 10;

function findById(items, id) {
  return items.find((item) => item.id === id);
}

export function calculateDrink(config, data) {
  const errors = [];
  const base = findById(data.bases, config.baseId);
  const milk = findById(data.milks, config.milkId);
  const sizePrice = base?.prices?.[config.sizeId];
  const syrups = Array.isArray(config.syrups) ? config.syrups : [];
  const extras = Array.isArray(config.extras) ? config.extras : [];
  const quantity = Number(config.quantity);

  if (!base || typeof sizePrice !== "number") errors.push("Обрана основа або об'єм недоступні.");
  if (!milk) errors.push("Обраний вид молока недоступний.");
  if (base?.requiresMilk && config.milkId === "none") errors.push("Для цієї основи потрібно обрати молоко.");
  if (!base?.requiresMilk && config.milkId !== "none") errors.push("Для цієї основи молоко не додається.");
  if (syrups.length > MAX_SYRUPS) errors.push("Можна обрати не більше 3 порцій сиропу.");
  if (extras.length > MAX_EXTRAS) errors.push("Можна обрати не більше 3 додатків.");
  if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
    errors.push("Кількість має бути цілим числом від 1 до 10.");
  }
  if (errors.length) return { ok: false, errors };

  const syrupCost = syrups.length * data.syrupPrice;
  const extrasCost = extras.reduce((sum, id) => sum + (findById(data.extras, id)?.price || 0), 0);
  const unitCents = (sizePrice + milk.price + syrupCost + extrasCost) * 100;
  const lines = [
    { label: "Основа", value: base.name, cents: sizePrice * 100 },
    { label: "Молоко", value: milk.name, cents: milk.price * 100 },
    { label: "Сиропи", value: `${syrups.length} порц.`, cents: syrupCost * 100 },
    { label: "Додатки", value: `${extras.length}`, cents: extrasCost * 100 }
  ];
  return { ok: true, unitCents, totalCents: unitCents * quantity, lines };
}

export function getAvailableSizes(base) {
  return Object.keys(base?.prices || {});
}
