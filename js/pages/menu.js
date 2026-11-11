import { initializeTheme } from "../modules/theme.js";
import { updateCartCount } from "../modules/cart.js";
import { addToCart } from "../modules/cart.js";
import { loadJson } from "../modules/data.js";

initializeTheme();
updateCartCount();

const list = document.querySelector("[data-menu-list]");
const status = document.querySelector("[data-menu-status]");
const search = document.querySelector("#menu-search");
let items = [];
let category = "all";

function render() {
  const query = search.value.trim().toLocaleLowerCase("uk-UA");
  const tags = [...document.querySelectorAll("[data-tag]:checked")].map((input) => input.dataset.tag);
  const filtered = items.filter((item) => {
    const matchesText = `${item.name} ${item.description}`.toLocaleLowerCase("uk-UA").includes(query);
    const matchesCategory = category === "all" || item.category === category;
    const matchesTags = tags.every((tag) => tag === "nuts"
      ? !item.tags.includes("nuts")
      : item.tags.includes(tag));
    return matchesText && matchesCategory && matchesTags;
  });
  list.replaceChildren();
  filtered.forEach((item) => {
    const card = document.createElement("article");
    card.className = "surface overflow-hidden rounded-2xl";
    const image = document.createElement("img");
    image.src = item.image || "assets/images/placeholder.svg";
    image.alt = item.alt;
    image.width = item.width || 800;
    image.height = item.height || 600;
    image.loading = "lazy";
    image.className = "aspect-[4/3] w-full object-cover";
    const content = document.createElement("div");
    content.className = "p-5";
    const title = document.createElement("h2");
    title.className = "text-xl font-bold";
    title.textContent = item.name;
    const description = document.createElement("p");
    description.className = "muted mt-2 min-h-12 text-sm";
    description.textContent = item.description;
    const footer = document.createElement("div");
    footer.className = "mt-5 flex items-center justify-between gap-3";
    const price = document.createElement("strong");
    price.textContent = item.price === null ? "Від 45 ₴" : `${item.price} ₴`;
    const link = document.createElement(item.builderBase ? "a" : "button");
    link.className = "brand-button rounded-xl px-4 py-3 text-sm font-bold";
    link.textContent = item.builderBase ? "Налаштувати" : "Додати";
    if (item.builderBase) {
      link.href = `builder.html?b=${encodeURIComponent(item.builderBase)}`;
    } else {
      link.type = "button";
      link.addEventListener("click", () => {
        addToCart({ id: `menu:${item.id}`, name: item.name, description: item.description, unitCents: item.price * 100, quantity: 1 });
        status.textContent = `${item.name} додано до кошика.`;
      });
    }
    footer.append(price, link);
    content.append(title, description, footer);
    card.append(image, content);
    list.append(card);
  });
  status.textContent = filtered.length ? `Показано позицій: ${filtered.length}` : "За цим запитом нічого не знайдено.";
}

document.querySelectorAll("[data-category]").forEach((button) => {
  button.addEventListener("click", () => {
    category = button.dataset.category;
    document.querySelectorAll("[data-category]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    render();
  });
});
search.addEventListener("input", render);
document.querySelectorAll("[data-tag]").forEach((input) => input.addEventListener("change", render));

try {
  const data = await loadJson("../../data/menu.json");
  items = Array.isArray(data.items) ? data.items : [];
  render();
} catch (error) {
  console.error(error);
  status.textContent = "Не вдалося завантажити меню. Спробуйте оновити сторінку.";
  const retry = document.createElement("button");
  retry.className = "brand-button ml-3 rounded-xl px-4 py-3 font-bold";
  retry.type = "button";
  retry.textContent = "Спробувати ще";
  retry.addEventListener("click", () => window.location.reload());
  status.append(retry);
}
