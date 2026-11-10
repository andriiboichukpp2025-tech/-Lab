import { initializeTheme } from "../modules/theme.js";
import { updateCartCount } from "../modules/cart.js";
import { loadJson } from "../modules/data.js";

initializeTheme();
updateCartCount();

try {
  const site = await loadJson("../../data/site.json");
  const gallery = document.querySelector("[data-gallery]");
  site.gallery.forEach((item, index) => {
    const link = document.createElement("a");
    link.href = item.image || "assets/images/placeholder.svg";
    link.dataset.fancybox = "gallery";
    link.dataset.caption = item.title;
    const image = document.createElement("img");
    image.src = item.image || "assets/images/placeholder.svg";
    image.alt = item.alt;
    image.width = 800;
    image.height = 600;
    image.loading = index === 0 ? "eager" : "lazy";
    image.className = "aspect-[4/3] w-full rounded-2xl object-cover";
    link.append(image);
    gallery.append(link);
  });
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
  if (typeof Fancybox !== "undefined" && gallery) {
    Fancybox.bind("[data-fancybox='gallery']");
  } else {
    console.warn("Fancybox недоступний; галерея працює як звичайні посилання.");
  }
} catch (error) {
  console.error("Не вдалося завантажити дані сторінки «Про нас».", error);
}
