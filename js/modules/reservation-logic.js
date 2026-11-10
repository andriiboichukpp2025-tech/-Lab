function hash(value) {
  let result = 2166136261;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function isSeededBusy(tableId, date, time) {
  const hour = Number(time.slice(0, 2));
  const threshold = hour >= 18 && hour < 21 ? 0.55 : 0.3;
  return (hash(`${tableId}|${date}|${time}`) % 1000) / 1000 < threshold;
}

export function intervalsOverlap(startA, durationA, startB, durationB) {
  const a = new Date(startA).getTime();
  const b = new Date(startB).getTime();
  return a < b + durationB * 60000 && b < a + durationA * 60000;
}

export function isBusy({ tableId, date, time, duration, reservations = [] }) {
  if (isSeededBusy(tableId, date, time)) return true;
  const start = `${date}T${time}:00`;
  return reservations.some((reservation) => reservation.tableId === tableId
    && intervalsOverlap(start, duration, `${reservation.date}T${reservation.time}:00`, reservation.duration));
}

export function validateReservation(input, now = new Date()) {
  const errors = [];
  const date = new Date(`${input.date}T${input.time || "00:00"}:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);
  const lastDate = new Date(`${input.date}T22:00:00`);
  if (!input.date || Number.isNaN(date.getTime()) || date < today || date > maxDate) errors.push("Оберіть дату в межах наступних 30 днів.");
  if (!input.time || Number.isNaN(date.getTime()) || date.getHours() < 9 || date.getHours() > 20 || (date.getHours() === 20 && date.getMinutes() > 30)) errors.push("Оберіть час від 09:00 до 20:30.");
  if (input.date === today.toISOString().slice(0, 10) && date.getTime() < now.getTime() + 30 * 60000) errors.push("Для сьогоднішньої дати оберіть час не раніше ніж через 30 хвилин.");
  if (![60, 90, 120].includes(Number(input.duration)) || date.getTime() + Number(input.duration) * 60000 > lastDate.getTime()) errors.push("Перевірте тривалість бронювання.");
  if (!Number.isInteger(Number(input.guests)) || Number(input.guests) < 1 || Number(input.guests) > 8) errors.push("Кількість гостей має бути від 1 до 8.");
  return errors;
}

export function makeReservationCode(existingCodes = []) {
  let code;
  do {
    code = `KL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  } while (existingCodes.includes(code));
  return code;
}
