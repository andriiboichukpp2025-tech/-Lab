import { initializeTheme } from "../modules/theme.js";
import { updateCartCount } from "../modules/cart.js";
import { validateField } from "../modules/validation.js";

initializeTheme();
updateCartCount();

const form = document.querySelector("[data-contact-form]");
const status = document.querySelector("[data-contact-status]");
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const valid = validateField("name", String(data.get("name") || ""))
    && validateField("email", String(data.get("email") || ""))
    && validateField("message", String(data.get("message") || ""))
    && data.get("consent") === "on";
  status.textContent = valid
    ? "Дякуємо! Це демо: повідомлення не надсилається на сервер."
    : "Перевірте ім'я, email, повідомлення (10–500 символів) і згоду.";
  status.className = valid ? "text-sm text-green-700" : "text-sm text-red-700";
});
