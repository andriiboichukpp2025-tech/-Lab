import { initializeTheme } from "../modules/theme.js";
import { updateCartCount } from "../modules/cart.js";
import { loadJson } from "../modules/data.js";

initializeTheme();
updateCartCount();

try {
  const site = await loadJson("../../data/site.json");
  const faq = document.querySelector("[data-faq]");
  site.faq.forEach((item) => {
    const details = document.createElement("details");
    details.className = "surface rounded-xl p-4";
    const summary = document.createElement("summary");
    summary.className = "cursor-pointer font-bold";
    summary.textContent = item.question;
    const answer = document.createElement("p");
    answer.className = "muted mt-3";
    answer.textContent = item.answer;
    details.append(summary, answer);
    faq.append(details);
  });
} catch (error) {
  console.error("Не вдалося завантажити дані сторінки «Про нас».", error);
  const retry = document.createElement("button");
  retry.className = "brand-button mt-4 rounded-xl px-4 py-3 font-bold";
  retry.type = "button";
  retry.textContent = "Спробувати ще";
  retry.addEventListener("click", () => window.location.reload());
  document.querySelector("[data-faq]")?.append(retry);
}
