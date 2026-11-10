import { initializeTheme } from "../modules/theme.js";
import { updateCartCount } from "../modules/cart.js";
import { loadJson } from "../modules/data.js";

initializeTheme();
updateCartCount();

try {
  const [menu, site] = await Promise.all([loadJson("../../data/menu.json"), loadJson("../../data/site.json")]);
  const featuredList = document.querySelector("[data-featured-list]");
  menu.items.filter((item) => item.featured).forEach((item) => {
    const slide = document.createElement("article");
    slide.className = "swiper-slide surface overflow-hidden rounded-2xl";
    const image = document.createElement("img");
    image.src = item.image || "assets/images/placeholder.svg";
    image.alt = item.alt;
    image.width = 800;
    image.height = 600;
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
    card.append(title, text);
    offersList.append(card);
  });
  if (typeof Swiper !== "undefined" && featuredList) {
    new Swiper("[data-featured-slider]", { slidesPerView: 1, spaceBetween: 16, pagination: { el: ".swiper-pagination", clickable: true }, breakpoints: { 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } } });
  } else {
    console.warn("Swiper недоступний; слайдер показано без інтерактивності.");
  }
} catch (error) {
  console.error("Не вдалося завантажити дані головної сторінки.", error);
}
