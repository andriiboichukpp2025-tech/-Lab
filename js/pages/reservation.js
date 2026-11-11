import { initializeTheme } from "../modules/theme.js";
import { updateCartCount } from "../modules/cart.js";
import { loadJson } from "../modules/data.js";
import { normalizePhone, validateField } from "../modules/validation.js";
import { readStorage, writeStorage } from "../modules/storage.js";
import { isBusy, makeReservationCode, validateReservation } from "../modules/reservation-logic.js";
import { formatPrice } from "../modules/format.js";
import { buildChairs } from "../modules/floor-plan.js";

initializeTheme();
updateCartCount();

const RESERVATIONS_KEY = "kavalab:reservations:v1";
const DISMISSED_LEGACY_KEY = "kavalab:legacy-reservations-dismissed:v1";
const form = document.querySelector("[data-reservation-form]");
const steps = [...document.querySelectorAll("[data-step]")];
const statusElements = document.querySelectorAll("[data-reservation-status]");
const storedReservations = readStorage(RESERVATIONS_KEY, []);
const dismissedLegacy = readStorage(DISMISSED_LEGACY_KEY, []);
const state = { step: 1, tableId: null, tables: [], layout: { fixed: [] }, menu: [], preorder: [], zone: "Усі", zoom: 1, reservations: Array.isArray(storedReservations) ? storedReservations : [], legacyReservations: [], dismissedLegacy: Array.isArray(dismissedLegacy) ? dismissedLegacy : [] };
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

function createConfirmationDialog(reservation) {
  const dialog = document.createElement("dialog");
  dialog.className = "surface max-w-md rounded-2xl p-6";
  const heading = document.createElement("h2");
  heading.className = "text-2xl font-bold";
  heading.textContent = "Бронювання підтверджено";
  const text = document.createElement("p");
  text.className = "muted mt-3";
  text.textContent = `Код бронювання: ${reservation.code}. Столик ${reservation.tableId}, ${reservation.date} о ${reservation.time}.`;
  const actions = document.createElement("div");
  actions.className = "mt-6 flex flex-wrap gap-3";
  const calendar = document.createElement("button");
  calendar.className = "brand-button min-h-12 rounded-xl px-4 py-3 font-bold";
  calendar.type = "button";
  calendar.textContent = "Додати в календар";
  calendar.addEventListener("click", () => {
    const start = `${reservation.date.replaceAll("-", "")}T${reservation.time.replace(":", "")}00`;
    const end = new Date(`${reservation.date}T${reservation.time}:00`);
    end.setMinutes(end.getMinutes() + reservation.duration);
    const endValue = end.toISOString().replaceAll("-", "").replaceAll(":", "").slice(0, 15) + "00";
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KavaLab//Reservation//UK",
      "BEGIN:VEVENT", `UID:${reservation.code}@kavalab.example`, `DTSTART:${start}`, `DTEND:${endValue}`,
      `SUMMARY:Бронювання КаваLab ${reservation.tableId}`, "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reservation.code}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  });
  const print = document.createElement("button");
  print.className = "min-h-12 rounded-xl border px-4 py-3 font-bold";
  print.style.borderColor = "var(--border)";
  print.type = "button";
  print.textContent = "Друк";
  print.addEventListener("click", () => window.print());
  const close = document.createElement("button");
  close.className = "min-h-12 rounded-xl border px-4 py-3 font-bold";
  close.style.borderColor = "var(--border)";
  close.type = "button";
  close.textContent = "Закрити";
  close.addEventListener("click", () => dialog.close());
  actions.append(calendar, print, close);
  dialog.append(heading, text, actions);
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.showModal();
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
  group.setAttribute("aria-label", `Столик ${table.id}, ${table.seats} місця, ${table.zone}`);
  group.dataset.tableId = table.id;
  const shape = document.createElementNS("http://www.w3.org/2000/svg", table.shape === "circle" ? "circle" : "rect");
  if (table.shape === "circle") {
    shape.setAttribute("cx", table.x);
    shape.setAttribute("cy", table.y);
    shape.setAttribute("r", table.size.diameter / 2);
  } else {
    shape.setAttribute("x", table.x - table.size.width / 2);
    shape.setAttribute("y", table.y - table.size.height / 2);
    shape.setAttribute("width", table.size.width);
    shape.setAttribute("height", table.size.height);
    shape.setAttribute("rx", "12");
  }
  shape.classList.add("table-shape");
  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", table.x);
  label.setAttribute("y", table.y + 5);
  label.setAttribute("text-anchor", "middle");
  label.textContent = table.id;
  const capacityIcon = document.createElementNS("http://www.w3.org/2000/svg", "text");
  capacityIcon.setAttribute("x", table.x + 20);
  capacityIcon.setAttribute("y", table.y - 20);
  capacityIcon.classList.add("capacity-icon");
  capacityIcon.textContent = "⊘";
  const hit = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  hit.setAttribute("x", table.x - 30);
  hit.setAttribute("y", table.y - 30);
  hit.setAttribute("width", "60");
  hit.setAttribute("height", "60");
  hit.classList.add("table-hit");
  group.append(hit, shape, label, capacityIcon);
  const update = () => {
    const guests = Number(document.querySelector("[data-guests]").value);
    const capacityBlocked = table.seats < guests;
    const busy = capacityBlocked || isBusy({ tableId: table.id, date: dateInput.value, time: document.querySelector("[data-time]").value, duration: Number(document.querySelector("[data-duration]").value), reservations: state.reservations });
    group.classList.toggle("table-capacity", capacityBlocked);
    capacityIcon.classList.toggle("hidden", !capacityBlocked);
    group.setAttribute("aria-label", capacityBlocked
      ? `Столик ${table.id}, недоступний за місткістю: ${table.seats} місця, ${table.zone}`
      : `Столик ${table.id}, ${table.seats} місця, ${table.zone}`);
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
  svg.style.transform = `scale(${state.zoom})`;
  svg.style.transformOrigin = "top left";
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
  const floor = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  floor.setAttribute("x", "20"); floor.setAttribute("y", "20"); floor.setAttribute("width", "1160"); floor.setAttribute("height", "760"); floor.classList.add("map-floor");
  svg.append(floor);
  state.layout.walls.forEach((wallData) => {
    const wall = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    wall.setAttribute("x", wallData.x);
    wall.setAttribute("y", wallData.y);
    wall.setAttribute("width", wallData.width);
    wall.setAttribute("height", wallData.height);
    wall.classList.add("map-wall");
    svg.append(wall);
  });
  state.layout.fixed.forEach((item) => {
    const fixed = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    fixed.setAttribute("x", item.x); fixed.setAttribute("y", item.y); fixed.setAttribute("width", item.width); fixed.setAttribute("height", item.height); fixed.classList.add("fixed-furniture");
    svg.append(fixed);
  });
  const labels = [
    ["Санвузол", 120, 120], ["Кухня", 380, 120], ["Бариста", 870, 75], ["Каса", 870, 165],
    ["Вхід", 680, 770], ["Вікна", 40, 440], ["Лаунж", 1080, 280]
  ];
  labels.forEach(([textValue, x, y]) => {
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x); label.setAttribute("y", y); label.classList.add("map-label"); label.textContent = textValue; svg.append(label);
  });
  const windows = [
    { x: 20, y: 260, width: 8, height: 360 },
    { x: 100, y: 772, width: 460, height: 8 }
  ];
  windows.forEach((windowRect) => {
    const windowElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    windowElement.setAttribute("x", windowRect.x); windowElement.setAttribute("y", windowRect.y); windowElement.setAttribute("width", windowRect.width); windowElement.setAttribute("height", windowRect.height); windowElement.classList.add("map-window");
    svg.append(windowElement);
  });
  const door = document.createElementNS("http://www.w3.org/2000/svg", "path");
  door.setAttribute("d", "M620 780 A120 120 0 0 1 740 660");
  door.classList.add("map-door");
  svg.append(door);
  [{ x: 560, y: 690 }, { x: 1140, y: 620 }, { x: 800, y: 430 }].forEach((plant) => {
    const plantElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    plantElement.setAttribute("cx", plant.x); plantElement.setAttribute("cy", plant.y); plantElement.setAttribute("r", "18"); plantElement.classList.add("map-plant");
    svg.append(plantElement);
  });
  state.tables.filter((table) => state.zone === "Усі" || table.zone === state.zone).forEach((table) => {
    const group = tableElement(table);
    buildChairs(table).forEach((chair) => {
      const chairElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      chairElement.setAttribute("x", chair.x - chair.width / 2);
      chairElement.setAttribute("y", chair.y - chair.height / 2);
      chairElement.setAttribute("width", chair.width);
      chairElement.setAttribute("height", chair.height);
      chairElement.setAttribute("rx", "10");
      chairElement.classList.add("chair-shape", `chair-${chair.side}`);
      group.append(chairElement);
    });
    svg.append(group);
  });
  const selected = state.tables.find((table) => table.id === state.tableId);
  document.querySelector("[data-table-details]").textContent = selected ? `${selected.id}: ${selected.zone}, ${selected.seats} місця. ${selected.features.join(", ") || "звичайне місце"}.` : "Оберіть вільний столик.";
  renderTableList();
}

function renderTableList() {
  const target = document.querySelector("[data-table-list]");
  target.replaceChildren();
  state.tables.filter((table) => state.zone === "Усі" || table.zone === state.zone).forEach((table) => {
    const button = document.createElement("button");
    button.className = "surface rounded-xl p-4 text-left";
    button.type = "button";
    button.textContent = `${table.id} · ${table.zone} · ${table.seats} місця`;
    button.addEventListener("click", () => { state.tableId = table.id; renderMap(); });
    target.append(button);
  });
}

function renderZoneFilters() {
  const target = document.querySelector("[data-zone-filters]");
  target.replaceChildren();
  ["Усі", "Бар", "Вікно", "Зал", "Лаунж", "Великий стіл"].forEach((zone) => {
    const button = document.createElement("button");
    button.className = "min-h-11 rounded-xl border px-3";
    button.type = "button";
    button.textContent = zone;
    button.setAttribute("aria-pressed", String(state.zone === zone));
    button.addEventListener("click", () => { state.zone = zone; renderZoneFilters(); renderMap(); });
    target.append(button);
  });
}

function showStep(step) {
  state.step = step;
  steps.forEach((section) => section.classList.toggle("hidden", Number(section.dataset.step) !== step));
  document.querySelector(`[data-step-indicator="${step}"]`)?.focus();
  if (step === 2) renderMap();
  if (step === 3) renderPreorder();
  if (step === 5) renderReservationSummary();
}

function renderPreorder() {
  const menuTarget = document.querySelector("[data-preorder-menu]");
  const cartTarget = document.querySelector("[data-preorder-cart]");
  menuTarget.replaceChildren();
  cartTarget.replaceChildren();
  state.menu.filter((item) => item.category !== "coffee" || item.builderBase === null).forEach((item) => {
    const button = document.createElement("button");
    button.className = "surface min-h-12 rounded-xl p-4 text-left";
    button.type = "button";
    button.textContent = `${item.name} · ${item.price ?? "від 45"} ₴`;
    button.addEventListener("click", () => {
      const existing = state.preorder.find((entry) => entry.id === item.id);
      if (existing) existing.quantity = Math.min(20, existing.quantity + 1);
      else if (item.price !== null) state.preorder.push({ id: item.id, name: item.name, unitCents: item.price * 100, quantity: 1 });
      renderPreorder();
    });
    menuTarget.append(button);
  });
  state.preorder.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "flex items-center justify-between gap-2 text-sm";
    const label = document.createElement("span");
    label.textContent = `${item.name} × ${item.quantity}`;
    const controls = document.createElement("div");
    controls.className = "flex gap-1";
    const minus = document.createElement("button");
    minus.className = "min-h-11 min-w-11 rounded-lg border";
    minus.type = "button";
    minus.textContent = "−";
    minus.addEventListener("click", () => { item.quantity -= 1; if (item.quantity < 1) state.preorder.splice(index, 1); renderPreorder(); });
    const plus = document.createElement("button");
    plus.className = "min-h-11 min-w-11 rounded-lg border";
    plus.type = "button";
    plus.textContent = "+";
    plus.addEventListener("click", () => { item.quantity = Math.min(20, item.quantity + 1); renderPreorder(); });
    controls.append(minus, plus);
    row.append(label, controls);
    cartTarget.append(row);
  });
  const total = state.preorder.reduce((sum, item) => sum + item.unitCents * item.quantity, 0);
  document.querySelector("[data-preorder-total]").textContent = `Разом: ${formatPrice(total)}`;
}

function renderReservationSummary() {
  const target = document.querySelector("[data-reservation-summary]");
  const total = state.preorder.reduce((sum, item) => sum + item.unitCents * item.quantity, 0);
  target.textContent = `${dateInput.value}, ${document.querySelector("[data-time]").value}; столик ${state.tableId}; ${document.querySelector("[data-guests]").value} гостей; передзамовлення: ${formatPrice(total)}.`;
}

function renderReservations() {
  const target = document.querySelector("[data-my-reservations]");
  target.replaceChildren();
  [...state.legacyReservations.map((reservation) => ({ ...reservation, legacy: true, original: reservation })), ...state.reservations].forEach((reservation) => {
    const card = document.createElement("article");
    card.className = "surface flex flex-wrap items-center justify-between gap-3 rounded-xl p-4";
    const text = document.createElement("p");
    text.textContent = reservation.legacy
      ? `${reservation.code || "Старе бронювання"}: Застаріле бронювання — столик ${reservation.tableId || "невідомий"}`
      : `${reservation.code}: ${reservation.date}, ${reservation.time}, столик ${reservation.tableId}`;
    const button = document.createElement("button");
    button.className = "min-h-12 rounded-xl border px-4 font-bold";
    button.style.borderColor = "var(--border)";
    button.type = "button";
    button.textContent = "Скасувати";
    button.addEventListener("click", () => {
      if (reservation.legacy) {
        state.legacyReservations = state.legacyReservations.filter((item) => item !== reservation.original);
        const legacyKey = reservation.original.code || `${reservation.original.tableId}|${reservation.original.date}|${reservation.original.time}`;
        state.dismissedLegacy.push(legacyKey);
        writeStorage(DISMISSED_LEGACY_KEY, state.dismissedLegacy);
      }
      else state.reservations = state.reservations.filter((item) => item.code !== reservation.code);
      writeStorage(RESERVATIONS_KEY, state.reservations);
      renderReservations();
    });
    card.append(text, button);
    target.append(card);
  });
}

renderTimes();
document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
  const listMode = button.dataset.view === "list";
  document.querySelector("[data-map-view]").classList.toggle("hidden", listMode);
  document.querySelector("[data-table-list]").classList.toggle("hidden", !listMode);
  document.querySelectorAll("[data-view]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
}));
document.querySelectorAll("[data-map-zoom]").forEach((button) => button.addEventListener("click", () => {
  const action = button.dataset.mapZoom;
  state.zoom = action === "reset" ? 1 : Math.min(1.6, Math.max(0.8, state.zoom + (action === "in" ? 0.2 : -0.2)));
  renderMap();
}));
document.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", () => {
  const input = { date: dateInput.value, time: document.querySelector("[data-time]").value, duration: document.querySelector("[data-duration]").value, guests: Number(document.querySelector("[data-guests]").value) };
  const errors = validateReservation(input);
  if (state.step === 1 && errors.length) { setStatus(errors.join(" ")); return; }
  if (state.step === 2 && !state.tableId) { setStatus("Оберіть вільний столик."); return; }
  if (state.step === 2 && isBusy({ tableId: state.tableId, date: dateInput.value, time: document.querySelector("[data-time]").value, duration: Number(document.querySelector("[data-duration]").value), reservations: state.reservations })) {
    state.tableId = null;
    setStatus("Обраний столик щойно став недоступним. Оберіть інший.");
    renderMap();
    return;
  }
  if (state.step === 4) {
    const phone = normalizePhone(document.querySelector("[data-phone]").value);
    if (!validateField("name", document.querySelector("[data-name]").value)
      || !validateField("phone", phone)
      || !validateField("email", document.querySelector("[data-email]").value)
      || !document.querySelector("[data-consent]").checked) {
      setStatus("Перевірте ім'я, телефон, email і згоду.");
      return;
    }
  }
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
  const reservationInput = { date: dateInput.value, time: document.querySelector("[data-time]").value, duration: document.querySelector("[data-duration]").value, guests: Number(document.querySelector("[data-guests]").value) };
  if (state.step !== 5 || validateReservation(reservationInput).length || !state.tableId || isBusy({ tableId: state.tableId, ...reservationInput, reservations: state.reservations }) || !validateField("name", name) || !validateField("phone", phone) || !validateField("email", email) || !document.querySelector("[data-consent]").checked) {
    setStatus("Перевірте ім'я, телефон, email і згоду.");
    return;
  }
  const reservation = { code: makeReservationCode(state.reservations.map((item) => item.code)), tableId: state.tableId, date: dateInput.value, time: document.querySelector("[data-time]").value, duration: Number(document.querySelector("[data-duration]").value), guests: Number(document.querySelector("[data-guests]").value), name, phone, email, preorder: state.preorder };
  state.reservations.push(reservation);
  writeStorage(RESERVATIONS_KEY, state.reservations);
  renderReservations();
  setStatus(`Бронювання підтверджено. Код: ${reservation.code}`);
  createConfirmationDialog(reservation);
  showStep(1);
});

try {
  const [data, menu] = await Promise.all([loadJson("../../data/tables.json"), loadJson("../../data/menu.json")]);
  state.layout = data.layout;
  state.tables = data.tables;
  state.menu = menu.items;
  const validIds = new Set(state.tables.map((table) => table.id));
  state.legacyReservations = state.reservations.filter((reservation) => {
    if (validIds.has(reservation.tableId)) return false;
    const legacyKey = reservation.code || `${reservation.tableId}|${reservation.date}|${reservation.time}`;
    return !state.dismissedLegacy.includes(legacyKey);
  });
  state.reservations = state.reservations.filter((reservation) => validIds.has(reservation.tableId));
  if (state.legacyReservations.length) setStatus("Є застарілі бронювання. Їх можна видалити нижче.");
  renderZoneFilters();
  renderMap();
  renderReservations();
} catch (error) {
  console.error(error);
  setStatus("Не вдалося завантажити карту залу.");
  const retry = document.createElement("button");
  retry.className = "brand-button ml-3 rounded-xl px-4 py-3 font-bold";
  retry.type = "button";
  retry.textContent = "Спробувати ще";
  retry.addEventListener("click", () => window.location.reload());
  document.querySelector("[data-reservation-status]")?.append(retry);
}
