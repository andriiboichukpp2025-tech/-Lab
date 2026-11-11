import { initializeTheme } from "../modules/theme.js";
import { addToCart, updateCartCount } from "../modules/cart.js";
import { loadJson } from "../modules/data.js";
import { formatPrice } from "../modules/format.js";
import { calculateDrink, getAvailableSizes } from "../modules/pricing.js";
import { configureUrlState, parseBuilderUrl, serializeBuilderUrl } from "../modules/url-state.js";

initializeTheme();
updateCartCount();

const form = document.querySelector("[data-builder-form]");
const status = document.querySelector("[data-builder-status]");
let data;
let state;

function optionLabel(container, item, type, checked = false) {
  const label = document.createElement("label");
  label.className = "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3";
  label.style.borderColor = "var(--border)";
  const input = document.createElement("input");
  input.type = type === "checkbox" ? "checkbox" : "radio";
  input.name = type;
  input.value = item.id;
  input.checked = checked;
  input.dataset.option = type;
  const text = document.createElement("span");
  text.textContent = item.label || item.name;
  label.append(input, text);
  container.append(label);
  return input;
}

function normalizeState() {
  const base = data.bases.find((item) => item.id === state.baseId) || data.bases[0];
  state.baseId = base.id;
  const sizes = getAvailableSizes(base);
  if (!sizes.includes(state.sizeId)) state.sizeId = sizes[0];
  state.milkId = base.requiresMilk
    ? (data.milks.some((item) => item.id === state.milkId && item.id !== "none") ? state.milkId : "cow")
    : "none";
  state.syrups = state.syrups.filter((id) => data.syrups.some((item) => item.id === id)).slice(0, 3);
  state.extras = state.extras.filter((id) => data.extras.some((item) => item.id === id)).slice(0, 3);
  state.quantity = Number.isInteger(state.quantity) && state.quantity >= 1 && state.quantity <= 10 ? state.quantity : 1;
}

function render() {
  normalizeState();
  const baseContainer = document.querySelector("[data-bases]");
  const sizeContainer = document.querySelector("[data-sizes]");
  const milkContainer = document.querySelector("[data-milks]");
  const syrupContainer = document.querySelector("[data-syrups]");
  const extrasContainer = document.querySelector("[data-extras]");
  [baseContainer, sizeContainer, milkContainer, syrupContainer, extrasContainer].forEach((container) => container.replaceChildren());
  data.bases.forEach((item) => optionLabel(baseContainer, item, "baseId", item.id === state.baseId).addEventListener("change", () => { state.baseId = item.id; render(); }));
  Object.entries(data.sizes).forEach(([id, item]) => {
    const input = optionLabel(sizeContainer, { id, label: `${item.label} · ${item.milliliters} мл` }, "sizeId", id === state.sizeId);
    input.disabled = !getAvailableSizes(data.bases.find((base) => base.id === state.baseId)).includes(id);
    input.addEventListener("change", () => { state.sizeId = id; render(); });
  });
  data.milks.forEach((item) => {
    const input = optionLabel(milkContainer, item, "milkId", item.id === state.milkId);
    input.disabled = data.bases.find((base) => base.id === state.baseId).requiresMilk ? item.id === "none" : item.id !== "none";
    input.addEventListener("change", () => { state.milkId = item.id; render(); });
  });
  data.syrups.forEach((item) => {
    const input = optionLabel(syrupContainer, item, "syrups", state.syrups.includes(item.id));
    input.addEventListener("change", () => {
      state.syrups = input.checked ? [...state.syrups, item.id].slice(0, 3) : state.syrups.filter((id) => id !== item.id);
      render();
    });
  });
  data.extras.forEach((item) => {
    const input = optionLabel(extrasContainer, item, "extras", state.extras.includes(item.id));
    input.addEventListener("change", () => {
      state.extras = input.checked ? [...state.extras, item.id].slice(0, 3) : state.extras.filter((id) => id !== item.id);
      render();
    });
  });
  document.querySelector("[data-quantity]").value = state.quantity;
  const result = calculateDrink(state, data);
  const lines = document.querySelector("[data-price-lines]");
  lines.replaceChildren();
  if (!result.ok) {
    status.textContent = result.errors.join(" ");
    document.querySelector("[data-total]").textContent = "—";
    return;
  }
  result.lines.forEach((line) => {
    const row = document.createElement("div");
    row.className = "flex justify-between gap-3";
    const label = document.createElement("dt");
    label.textContent = `${line.label}: ${line.value}`;
    const value = document.createElement("dd");
    value.textContent = formatPrice(line.cents);
    row.append(label, value);
    lines.append(row);
  });
  const quantityRow = document.createElement("div");
  quantityRow.className = "flex justify-between gap-3";
  quantityRow.textContent = `Кількість: ${state.quantity}`;
  lines.append(quantityRow);
  document.querySelector("[data-total]").textContent = formatPrice(result.totalCents);
  document.querySelector("[data-drink-description]").textContent = `${data.bases.find((item) => item.id === state.baseId).name}, ${data.sizes[state.sizeId].milliliters} мл`;
  status.textContent = "";
  history.replaceState(null, "", `builder.html${serializeBuilderUrl(state)}`);
}

document.querySelector("[data-quantity]")?.addEventListener("input", (event) => {
  state.quantity = Number(event.target.value);
  render();
});
document.querySelector("[data-quantity-minus]")?.addEventListener("click", () => { state.quantity = Math.max(1, state.quantity - 1); render(); });
document.querySelector("[data-quantity-plus]")?.addEventListener("click", () => { state.quantity = Math.min(10, state.quantity + 1); render(); });
document.querySelector("[data-reset]")?.addEventListener("click", () => {
  state = { baseId: data.bases[0].id, sizeId: "s", milkId: "none", syrups: [], extras: [], quantity: 1 };
  render();
});
document.querySelector("[data-add-drink]")?.addEventListener("click", (event) => {
  const result = calculateDrink(state, data);
  if (!result.ok) return;
  const button = event.currentTarget;
  button.disabled = true;
  addToCart({ id: `drink:${serializeBuilderUrl(state)}`, name: "Власний напій", description: document.querySelector("[data-drink-description]").textContent, unitCents: result.unitCents, quantity: state.quantity, config: { ...state } });
  status.textContent = "Напій додано до кошика.";
  window.setTimeout(() => { button.disabled = false; }, 400);
});
document.querySelector("[data-share]")?.addEventListener("click", async () => {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = "Посилання скопійовано.";
  } catch {
    status.textContent = "Не вдалося скопіювати посилання.";
  }
});

try {
  data = await loadJson("../../data/builder.json");
  configureUrlState(data);
  state = parseBuilderUrl(window.location.search);
  render();
} catch (error) {
  console.error(error);
  status.textContent = "Не вдалося завантажити конструктор.";
  const retry = document.createElement("button");
  retry.className = "brand-button ml-3 rounded-xl px-4 py-3 font-bold";
  retry.type = "button";
  retry.textContent = "Спробувати ще";
  retry.addEventListener("click", () => window.location.reload());
  status.append(retry);
}
