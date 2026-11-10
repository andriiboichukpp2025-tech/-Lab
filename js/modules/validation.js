export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PHONE_PATTERN = /^\+380\d{9}$/;
export const NAME_PATTERN = /^[\p{L}][\p{L}\s'’-]{1,49}$/u;
export const MESSAGE_PATTERN = /^.{10,500}$/su;

export function normalizePhone(value) {
  const trimmed = value.trim().replace(/[\s()-]/g, "");
  return /^0\d{9}$/.test(trimmed) ? `+38${trimmed}` : trimmed;
}

export function validateField(type, value) {
  const text = value.trim();
  if (type === "name") return NAME_PATTERN.test(text);
  if (type === "email") return EMAIL_PATTERN.test(text);
  if (type === "phone") return PHONE_PATTERN.test(normalizePhone(text));
  if (type === "message") return MESSAGE_PATTERN.test(text);
  return text.length > 0;
}
