import { getCart, saveCart, updateCartCount } from "../modules/cart.js";
import { initializeTheme } from "../modules/theme.js";
import { formatPrice } from "../modules/format.js";
import { loadJson } from "../modules/data.js";
import { normalizePhone, validateField } from "../modules/validation.js";
import { readStorage, writeStorage } from "../modules/storage.js";

initializeTheme();
updateCartCount();

const list = document.querySelector("[data-cart-list]");
const summary = document.querySelector("[data-cart-summary]");
const status = document.querySelector("[data-cart-status]");
const promoInput = document.querySelector("[data-promo]");
const checkoutSection = document.querySelector("[data-checkout-form-section]");
let items = getCart().filter((item) => item && typeof item.id === "string" && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 20 && Number.isFinite(item.unitCents));
let promoPercent = 0;
let promoCodes = {};

function totalCents() {
  return items.reduce((sum, item) => sum + item.unitCents * item.quantity, 0);
}

function render() {
  list.replaceChildren();
  items.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "surface flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5";
    const text = document.createElement("div");
    const title = document.createElement("h2");
    title.className = "font-bold";
    title.textContent = item.name;
    const description = document.createElement("p");
    description.className = "muted mt-1 text-sm";
    description.textContent = item.description || "";
    text.append(title, description);
    const controls = document.createElement("div");
    controls.className = "flex items-center gap-3";
    const quantity = document.createElement("input");
    quantity.className = "min-h-12 w-20 rounded-xl border bg-transparent text-center";
    quantity.style.borderColor = "var(--border)";
    quantity.type = "number"; quantity.min = "1"; quantity.max = "20"; quantity.value = String(item.quantity);
    quantity.addEventListener("change", () => { const value = Number(quantity.value); item.quantity = Number.isInteger(value) ? Math.min(20, Math.max(1, value)) : 1; saveCart(items); render(); updateCartCount(); });
    const price = document.createElement("strong");
    price.textContent = formatPrice(item.unitCents * item.quantity);
    const remove = document.createElement("button");
    remove.className = "min-h-12 rounded-xl border px-3";
    remove.style.borderColor = "var(--border)";
    remove.type = "button"; remove.textContent = "Видалити";
    remove.addEventListener("click", () => { items.splice(index, 1); saveCart(items); render(); updateCartCount(); });
    controls.append(quantity, price, remove);
    card.append(text, controls);
    list.append(card);
  });
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "surface rounded-2xl p-6";
    empty.textContent = "Кошик порожній. Додайте напій у конструкторі.";
    list.append(empty);
  }
  const subtotal = totalCents();
  const discount = Math.round(subtotal * promoPercent / 100);
  summary.replaceChildren();
  [["Підсумок", subtotal], [`Знижка (${promoPercent}%)`, -discount], ["Разом", subtotal - discount]].forEach(([labelText, value]) => {
    const row = document.createElement("div");
    row.className = "flex justify-between gap-3";
    const label = document.createElement("dt"); label.textContent = labelText;
    const amount = document.createElement("dd"); amount.textContent = formatPrice(value);
    row.append(label, amount); summary.append(row);
  });
}

document.querySelector("[data-apply-promo]").addEventListener("click", () => {
  const code = promoInput.value.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) { status.textContent = "Промокод має містити 4–12 латинських літер або цифр."; return; }
  if (!promoCodes[code]) { status.textContent = "Промокод не знайдено."; return; }
  if (promoPercent) { status.textContent = "Знижка вже застосована."; return; }
  promoPercent = promoCodes[code]; status.textContent = `Застосовано знижку ${promoPercent}%.`; render();
});
document.querySelector("[data-checkout]").addEventListener("click", () => {
  if (!items.length) { status.textContent = "Оформлення порожнього кошика неможливе."; return; }
  checkoutSection.hidden = false;
  checkoutSection.querySelector("input")?.focus();
});
document.querySelector("[data-checkout-form]").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("[data-checkout-name]").value;
  const email = document.querySelector("[data-checkout-email]").value;
  const phone = normalizePhone(document.querySelector("[data-checkout-phone]").value);
  const pickupTime = document.querySelector("[data-pickup-time]").value;
  const checkoutStatus = document.querySelector("[data-checkout-status]");
  if (!validateField("name", name) || !validateField("email", email) || !validateField("phone", phone) || !pickupTime) { checkoutStatus.textContent = "Перевірте ім'я, телефон, email і час отримання."; return; }
  const orders = readStorage("kavalab:orders:v1", []);
  orders.push({ id: `order-${Date.now()}`, items, name, email, phone, pickupTime, totalCents: totalCents() });
  writeStorage("kavalab:orders:v1", orders);
  items = []; saveCart(items); updateCartCount(); render();
  checkoutStatus.textContent = "Демо-замовлення збережено у цьому браузері.";
});

try {
  const site = await loadJson("../../data/site.json");
  promoCodes = site.promoCodes || {};
} catch (error) {
  console.error(error);
  status.textContent = "Не вдалося завантажити промокоди.";
  const retry = document.createElement("button");
  retry.className = "brand-button ml-3 rounded-xl px-4 py-3 font-bold";
  retry.type = "button";
  retry.textContent = "Спробувати ще";
  retry.addEventListener("click", () => window.location.reload());
  status.append(retry);
}
render();
