import { initializeTheme } from "../modules/theme.js";
import { updateCartCount } from "../modules/cart.js";
import { normalizePhone, validateField } from "../modules/validation.js";

initializeTheme();
updateCartCount();

const form = document.querySelector("[data-contact-form]");
const status = document.querySelector("[data-contact-status]");

const fieldLabels = ["name", "email", "phone", "message", "consent"];

function getFieldError(field, value, consentChecked) {
  if (field === "name") return validateField("name", value) ? "" : "Введіть ім'я від 2 до 50 символів.";
  if (field === "email") return validateField("email", value) ? "" : "Введіть коректну адресу email.";
  if (field === "phone") return validateField("phone", value) ? "" : "Введіть телефон у форматі 0XXXXXXXXX або +380XXXXXXXXX.";
  if (field === "message") return validateField("message", value) ? "" : "Повідомлення має містити від 10 до 500 символів.";
  if (field === "consent") return consentChecked ? "" : "Потрібно погодитися на обробку демо-даних.";
  return "";
}

function ensureErrorElement(field) {
  const input = form?.elements.namedItem(field);
  if (!input) return null;
  let error = form.querySelector(`[data-contact-error="${field}"]`);
  if (!error) {
    error = document.createElement("p");
    error.className = "mt-2 text-sm text-red-700 dark:text-red-300";
    error.dataset.contactError = field;
    error.setAttribute("aria-live", "polite");
    const errorId = `contact-${field}-error`;
    error.id = errorId;
    input.setAttribute("aria-describedby", errorId);
    input.closest("label")?.append(error);
  }
  return error;
}

function validateContactField(field, showEmptyError = true) {
  const input = form?.elements.namedItem(field);
  if (!input) return true;
  const value = field === "consent" ? "" : String(input.value || "");
  const message = getFieldError(field, value, field === "consent" ? input.checked : false);
  const visibleMessage = showEmptyError || value.trim() ? message : "";
  const error = ensureErrorElement(field);
  if (error) error.textContent = visibleMessage;
  input.setAttribute("aria-invalid", visibleMessage ? "true" : "false");
  return !visibleMessage;
}

if (form) {
  fieldLabels.forEach((field) => {
    const input = form.elements.namedItem(field);
    if (!input) return;
    ensureErrorElement(field);
    const eventName = field === "consent" ? "change" : "input";
    input.addEventListener(eventName, () => validateContactField(field, false));
    input.addEventListener("blur", () => validateContactField(field, true));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const phone = normalizePhone(String(data.get("phone") || ""));
    const results = {
      name: validateField("name", String(data.get("name") || "")),
      email: validateField("email", String(data.get("email") || "")),
      phone: validateField("phone", phone),
      message: validateField("message", String(data.get("message") || "")),
      consent: data.get("consent") === "on"
    };

    fieldLabels.forEach((field) => validateContactField(field, true));
    const valid = Object.values(results).every(Boolean);

    if (!valid) {
      status.textContent = "Перевірте виділені поля та погодьтеся на обробку демо-даних.";
      status.className = "text-sm text-red-700 dark:text-red-300";
      const firstInvalid = fieldLabels.find((field) => !results[field]);
      if (firstInvalid) form.elements.namedItem(firstInvalid)?.focus();
      return;
    }

    status.textContent = "Дякуємо! Це демо: повідомлення не надсилається на сервер.";
    status.className = "text-sm text-green-700 dark:text-green-300";
    document.querySelector("[data-contact-dialog]")?.showModal();
  });
}
document.querySelector("[data-contact-dialog-close]")?.addEventListener("click", () => document.querySelector("[data-contact-dialog]")?.close());
