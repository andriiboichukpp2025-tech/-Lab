import { initializeTheme } from "../modules/theme.js";
import { updateCartCount } from "../modules/cart.js";
import { loadJson } from "../modules/data.js";
import { calculateDrink } from "../modules/pricing.js";
import { formatPrice } from "../modules/format.js";
import { setupReviews } from "../modules/reviews.js";

initializeTheme();
updateCartCount();

try {
  const [menu, site, builder] = await Promise.all([loadJson("../../data/menu.json"), loadJson("../../data/site.json"), loadJson("../../data/builder.json")]);
  const stats = document.querySelector("[data-builder-stats]");
  stats.textContent = `${builder.bases.length} основ · ${builder.syrups.length} сиропів · ${builder.extras.length} додатків`;
  const featuredList = document.querySelector("[data-featured-list]");
  menu.items.filter((item) => item.featured).forEach((item) => {
    const slide = document.createElement("article");
    slide.className = "swiper-slide surface overflow-hidden rounded-2xl";
    const image = document.createElement("img");
    image.src = item.image || "assets/images/placeholder.svg";
    image.alt = item.alt;
    image.width = item.width || 800;
    image.height = item.height || 600;
    image.loading = "lazy";
    image.className = "aspect-[4/3] w-full object-cover";
    const text = document.createElement("div");
    text.className = "p-5";
    const title = document.createElement("h3");
    title.className = "text-xl font-bold";
    title.textContent = item.name;
    const description = document.createElement("p");
    description.className = "muted mt-2";
    description.textContent = item.description;
    text.append(title, description);
    slide.append(image, text);
    featuredList.append(slide);
  });
  const offersList = document.querySelector("[data-offers-list]");
  site.offers.forEach((offer) => {
    const card = document.createElement("article");
    card.className = "surface rounded-2xl p-6";
    const title = document.createElement("h3");
    title.className = "text-xl font-bold";
    title.textContent = offer.title;
    const text = document.createElement("p");
    text.className = "muted mt-2";
    text.textContent = offer.text;
    const copy = document.createElement("button");
    copy.className = "mt-4 min-h-11 rounded-xl border px-4 font-bold";
    copy.type = "button";
    copy.textContent = "Скопіювати промокод";
    copy.addEventListener("click", async () => {
      const code = offer.text.match(/[A-Z0-9]{4,12}/)?.[0];
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        copy.textContent = "Промокод скопійовано";
      } catch {
        copy.textContent = code;
      }
    });
    card.append(title, text, copy);
    offersList.append(card);
  });
  const recipes = [
    { name: "Лате з ваніллю", config: { baseId: "latte", sizeId: "m", milkId: "cow", syrups: ["vanilla"], extras: [], quantity: 1 } },
    { name: "Вівсяний капучино", config: { baseId: "cappuccino", sizeId: "m", milkId: "oat", syrups: [], extras: ["cinnamon"], quantity: 1 } },
    { name: "Американо з карамеллю", config: { baseId: "americano", sizeId: "l", milkId: "none", syrups: ["caramel"], extras: [], quantity: 1 } }
  ];
  const recipesList = document.querySelector("[data-recipes-list]");
  recipes.forEach((recipe) => {
    const result = calculateDrink(recipe.config, builder);
    const card = document.createElement("article");
    card.className = "surface rounded-2xl p-6";
    const title = document.createElement("h3");
    title.className = "text-xl font-bold";
    title.textContent = recipe.name;
    const price = document.createElement("p");
    price.className = "muted mt-2";
    price.textContent = result.ok ? formatPrice(result.totalCents) : "Ціна недоступна";
    const link = document.createElement("a");
    link.className = "brand-button mt-5 inline-block rounded-xl px-4 py-3 font-bold";
    link.href = `builder.html?b=${recipe.config.baseId}&s=${recipe.config.sizeId}&m=${recipe.config.milkId}${recipe.config.syrups.length ? `&sy=${recipe.config.syrups.join(":1,")}:1` : ""}${recipe.config.extras.length ? `&ex=${recipe.config.extras.join(":1,")}:1` : ""}`;
    link.textContent = "Налаштувати";
    card.append(title, price, link);
    recipesList.append(card);
  });
  setupReviews(site.reviews);
  if (typeof Swiper !== "undefined" && featuredList) {
    new Swiper("[data-featured-slider]", { slidesPerView: 1, spaceBetween: 16, pagination: { el: ".swiper-pagination", clickable: true }, breakpoints: { 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } } });
  } else {
    console.warn("Swiper недоступний; слайдер показано без інтерактивності.");
  }
} catch (error) {
  console.error("Не вдалося завантажити дані головної сторінки.", error);
  const target = document.querySelector("[data-offers-list]");
  if (target) {
    const retry = document.createElement("button");
    retry.className = "brand-button rounded-xl px-4 py-3 font-bold";
    retry.type = "button";
    retry.textContent = "Спробувати ще";
    retry.addEventListener("click", () => window.location.reload());
    target.replaceChildren(retry);
  }
}
