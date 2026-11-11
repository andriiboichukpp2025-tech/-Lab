import { readStorage, writeStorage } from "./storage.js";
import { validateField } from "./validation.js";

const REVIEWS_KEY = "kavalab:reviews:v1";
const MAX_REVIEWS = 100;

function getLocalReviews() {
  const reviews = readStorage(REVIEWS_KEY, []);
  if (!Array.isArray(reviews)) return [];
  return reviews.filter((review) => review && typeof review === "object" && typeof review.name === "string" && typeof review.text === "string" && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function createReviewSlide(review) {
  const slide = document.createElement("article");
  slide.className = "review-card swiper-slide surface rounded-2xl p-6";
  const header = document.createElement("div");
  header.className = "flex items-start justify-between gap-3";
  const name = document.createElement("h3");
  name.className = "font-bold";
  name.textContent = review.name;
  const date = document.createElement("time");
  date.className = "muted text-sm";
  date.dateTime = review.date;
  date.textContent = formatDate(review.date);
  header.append(name, date);
  const rating = document.createElement("p");
  rating.className = "review-stars mt-4";
  rating.setAttribute("aria-label", `Оцінка: ${review.rating} з 5`);
  rating.textContent = `${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}`;
  const text = document.createElement("p");
  text.className = "muted mt-3";
  text.textContent = review.text;
  const source = document.createElement("p");
  source.className = "muted mt-5 text-xs";
  source.textContent = review.demo ? "Демонстраційний відгук" : "Збережено в цьому браузері";
  slide.append(header, rating, text, source);
  return slide;
}

function updateSummary(reviews) {
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  document.querySelector("[data-reviews-average]").textContent = reviews.length ? `${average.toFixed(1)} / 5` : "—";
  document.querySelector("[data-reviews-count]").textContent = `${reviews.length} ${reviews.length === 1 ? "відгук" : "відгуків"}`;
}

function setError(field, message) {
  const error = document.querySelector(`[data-review-error="${field}"]`);
  if (error) error.textContent = message;
  const input = document.querySelector(`[name="${field}"]`);
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
}

export function setupReviews(demoReviews) {
  const form = document.querySelector("[data-review-form]");
  const list = document.querySelector("[data-reviews-list]");
  let reviews = [...demoReviews, ...getLocalReviews()];
  list.replaceChildren(...reviews.map(createReviewSlide));
  updateSummary(reviews);
  const slider = typeof Swiper !== "undefined" ? new Swiper("[data-reviews-slider]", {
    slidesPerView: 1,
    spaceBetween: 16,
    pagination: { el: "[data-reviews-slider] .swiper-pagination", clickable: true },
    breakpoints: { 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }
  }) : null;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const text = String(data.get("text") || "").trim();
    const rating = Number(data.get("rating"));
    const errors = {
      name: !validateField("name", name) ? "Введіть ім'я від 2 до 50 символів." : "",
      rating: !Number.isInteger(rating) || rating < 1 || rating > 5 ? "Оберіть оцінку від 1 до 5 зірок." : "",
      text: !/^.{10,500}$/su.test(text) ? "Відгук має містити від 10 до 500 символів." : ""
    };
    Object.entries(errors).forEach(([field, message]) => setError(field, message));
    if (Object.values(errors).some(Boolean)) return;
    const review = { id: `local-${Date.now()}`, name, text, rating, date: new Date().toISOString().slice(0, 10), demo: false };
    const nextLocal = [...getLocalReviews(), review].slice(-MAX_REVIEWS);
    if (!writeStorage(REVIEWS_KEY, nextLocal)) {
      document.querySelector("[data-review-status]").textContent = "Не вдалося зберегти відгук у цьому браузері.";
      return;
    }
    reviews = [...demoReviews, ...nextLocal];
    const slide = createReviewSlide(review);
    if (slider) slider.appendSlide(slide);
    else list.append(slide);
    updateSummary(reviews);
    form.reset();
    Object.keys(errors).forEach((field) => setError(field, ""));
    document.querySelector("[data-review-status]").textContent = "Дякуємо! Відгук додано лише в цьому браузері.";
  });
}
