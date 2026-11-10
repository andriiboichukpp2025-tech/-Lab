import { initializeTheme } from "../modules/theme.js";
import { updateCartCount } from "../modules/cart.js";
import { loadJson } from "../modules/data.js";
import { normalizePhone, validateField } from "../modules/validation.js";
import { readStorage, writeStorage } from "../modules/storage.js";
import { isBusy, makeReservationCode, validateReservation } from "../modules/reservation-logic.js";

initializeTheme();
updateCartCount();

const RESERVATIONS_KEY = "kavalab:reservations:v1";
const form = document.querySelector("[data-reservation-form]");
const steps = [...document.querySelectorAll("[data-step]")];
const statusElements = document.querySelectorAll("[data-reservation-status]");
const state = { step: 1, tableId: null, tables: [], reservations: readStorage(RESERVATIONS_KEY, []) };
const today = new Date();
const dateInput = document.querySelector("[data-date]");
dateInput.min = today.toISOString().slice(0, 10);
const maxDate = new Date(today);
maxDate.setDate(maxDate.getDate() + 30);
dateInput.max = maxDate.toISOString().slice(0, 10);
dateInput.value = dateInput.min;

function setStatus(message) {
  statusElements.forEach((element) => { element.textContent = message; });
}

function renderTimes() {
  const select = document.querySelector("[data-time]");
  select.replaceChildren();
  for (let hour = 9; hour <= 20; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === 20 && minute > 30) continue;
      const option = document.createElement("option");
      option.value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      option.textContent = option.value;
      select.append(option);
    }
  }
}

function tableElement(table) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("role", "button");
  group.setAttribute("tabindex", "0");
  group.setAttribute("aria-label", `Столик ${table.id}, ${table.capacity} місця, ${table.zone}`);
  group.dataset.tableId = table.id;
  const shape = document.createElementNS("http://www.w3.org/2000/svg", table.shape === "circle" ? "circle" : "rect");
  if (table.shape === "circle") {
    shape.setAttribute("cx", table.x);
    shape.setAttribute("cy", table.y);
    shape.setAttribute("r", table.radius);
  } else {
    shape.setAttribute("x", table.x - table.width / 2);
    shape.setAttribute("y", table.y - table.height / 2);
    shape.setAttribute("width", table.width);
    shape.setAttribute("height", table.height);
    shape.setAttribute("rx", "12");
  }
  shape.classList.add("table-shape");
  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", table.x);
  label.setAttribute("y", table.y + 5);
  label.setAttribute("text-anchor", "middle");
  label.textContent = table.id;
  group.append(shape, label);
  const update = () => {
    const guests = Number(document.querySelector("[data-guests]").value);
    const busy = table.capacity < guests || isBusy({ tableId: table.id, date: dateInput.value, time: document.querySelector("[data-time]").value, duration: Number(document.querySelector("[data-duration]").value), reservations: state.reservations });
    group.classList.toggle("table-busy", busy);
    group.classList.toggle("table-selected", table.id === state.tableId);
    group.setAttribute("aria-disabled", String(busy));
    group.onclick = () => {
      if (busy) return;
      state.tableId = state.tableId === table.id ? null : table.id;
      renderMap();
    };
  };
  group.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); group.click(); }
  });
  group.update = update;
  update();
  return group;
}

function renderMap() {
  const svg = document.querySelector("[data-floor-plan]");
  svg.replaceChildren();
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
  pattern.id = "busy-pattern";
  pattern.setAttribute("width", "8");
  pattern.setAttribute("height", "8");
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  const stripe = document.createElementNS("http://www.w3.org/2000/svg", "path");
  stripe.setAttribute("d", "M-2,2 l4,-4 M0,8 L8,0 M6,10 l4,-4");
  stripe.setAttribute("stroke", "var(--text)");
  stripe.setAttribute("stroke-width", "2");
  pattern.append(stripe);
  defs.append(pattern);
  svg.append(defs);
  const wall = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  wall.setAttribute("x", "10"); wall.setAttribute("y", "10"); wall.setAttribute("width", "780"); wall.setAttribute("height", "500"); wall.setAttribute("rx", "12"); wall.classList.add("map-wall");
  const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bar.setAttribute("x", "440"); bar.setAttribute("y", "30"); bar.setAttribute("width", "340"); bar.setAttribute("height", "50"); bar.classList.add("map-bar");
  svg.append(wall, bar);
  state.tables.forEach((table) => svg.append(tableElement(table)));
  const selected = state.tables.find((table) => table.id === state.tableId);
  document.querySelector("[data-table-details]").textContent = selected ? `${selected.id}: ${selected.zone}, ${selected.capacity} місця. ${selected.features.join(", ") || "звичайне місце"}.` : "Оберіть вільний столик.";
}

function showStep(step) {
  state.step = step;
  steps.forEach((section) => section.classList.toggle("hidden", Number(section.dataset.step) !== step));
  document.querySelector(`[data-step-indicator="${step}"]`)?.focus();
  if (step === 2) renderMap();
}

function renderReservations() {
  const target = document.querySelector("[data-my-reservations]");
  target.replaceChildren();
  state.reservations.forEach((reservation) => {
    const card = document.createElement("article");
    card.className = "surface flex flex-wrap items-center justify-between gap-3 rounded-xl p-4";
    const text = document.createElement("p");
    text.textContent = `${reservation.code}: ${reservation.date}, ${reservation.time}, столик ${reservation.tableId}`;
    const button = document.createElement("button");
    button.className = "min-h-12 rounded-xl border px-4 font-bold";
    button.style.borderColor = "var(--border)";
    button.type = "button";
    button.textContent = "Скасувати";
    button.addEventListener("click", () => {
      state.reservations = state.reservations.filter((item) => item.code !== reservation.code);
      writeStorage(RESERVATIONS_KEY, state.reservations);
      renderReservations();
    });
    card.append(text, button);
    target.append(card);
  });
}

renderTimes();
document.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", () => {
  const input = { date: dateInput.value, time: document.querySelector("[data-time]").value, duration: document.querySelector("[data-duration]").value, guests: Number(document.querySelector("[data-guests]").value) };
  const errors = validateReservation(input);
  if (state.step === 1 && errors.length) { setStatus(errors.join(" ")); return; }
  if (state.step === 2 && !state.tableId) { setStatus("Оберіть вільний столик."); return; }
  setStatus("");
  showStep(state.step + 1);
}));
document.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => showStep(state.step - 1)));
["change", "input"].forEach((eventName) => form.addEventListener(eventName, () => { if (state.step === 2) renderMap(); }));
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("[data-name]").value;
  const phone = normalizePhone(document.querySelector("[data-phone]").value);
  const email = document.querySelector("[data-email]").value;
  if (!validateField("name", name) || !validateField("phone", phone) || !validateField("email", email) || !document.querySelector("[data-consent]").checked) {
    setStatus("Перевірте ім'я, телефон, email і згоду.");
    return;
  }
  const reservation = { code: makeReservationCode(state.reservations.map((item) => item.code)), tableId: state.tableId, date: dateInput.value, time: document.querySelector("[data-time]").value, duration: Number(document.querySelector("[data-duration]").value), guests: Number(document.querySelector("[data-guests]").value), name, phone, email };
  state.reservations.push(reservation);
  writeStorage(RESERVATIONS_KEY, state.reservations);
  renderReservations();
  setStatus(`Бронювання підтверджено. Код: ${reservation.code}`);
  showStep(1);
});

try {
  const data = await loadJson("../../data/tables.json");
  state.tables = data.tables;
  renderMap();
  renderReservations();
} catch (error) {
  console.error(error);
  setStatus("Не вдалося завантажити карту залу.");
}
