const allowedBases = new Set();
const allowedSizes = new Set(["s", "m", "l"]);
const allowedMilks = new Set();
const allowedSyrups = new Set();
const allowedExtras = new Set();

export function configureUrlState(data) {
  allowedBases.clear();
  allowedMilks.clear();
  allowedSyrups.clear();
  allowedExtras.clear();
  data.bases.forEach((item) => allowedBases.add(item.id));
  data.milks.forEach((item) => allowedMilks.add(item.id));
  data.syrups.forEach((item) => allowedSyrups.add(item.id));
  data.extras.forEach((item) => allowedExtras.add(item.id));
}

function parseList(value, allowed) {
  if (!value) return [];
  return value.split(",").flatMap((entry) => {
    const [id, rawCount = "1"] = entry.split(":");
    const count = Number(rawCount);
    if (!allowed.has(id) || !Number.isInteger(count) || count < 1 || count > 3) return [];
    return Array.from({ length: count }, () => id);
  });
}

export function parseBuilderUrl(search) {
  const params = new URLSearchParams(search);
  const state = {
    baseId: allowedBases.has(params.get("b")) ? params.get("b") : null,
    sizeId: allowedSizes.has(params.get("s")) ? params.get("s") : null,
    milkId: allowedMilks.has(params.get("m")) ? params.get("m") : null,
    syrups: parseList(params.get("sy"), allowedSyrups),
    extras: parseList(params.get("ex"), allowedExtras),
    quantity: Number(params.get("q"))
  };
  if (!Number.isInteger(state.quantity) || state.quantity < 1 || state.quantity > 10) state.quantity = 1;
  return state;
}

export function serializeBuilderUrl(state) {
  const params = new URLSearchParams();
  if (allowedBases.has(state.baseId)) params.set("b", state.baseId);
  if (allowedSizes.has(state.sizeId)) params.set("s", state.sizeId);
  if (allowedMilks.has(state.milkId)) params.set("m", state.milkId);
  if (state.syrups?.length) params.set("sy", [...new Set(state.syrups)].map((id) => `${id}:${state.syrups.filter((item) => item === id).length}`).join(","));
  if (state.extras?.length) params.set("ex", [...new Set(state.extras)].join(","));
  if (Number.isInteger(state.quantity) && state.quantity >= 1 && state.quantity <= 10) params.set("q", String(state.quantity));
  return `?${params.toString()}`;
}
