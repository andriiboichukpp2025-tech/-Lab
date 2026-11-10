import { readStorage, writeStorage } from "./storage.js";

const THEME_KEY = "kavalab:theme";

export function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  const button = document.querySelector("[data-theme-toggle]");
  if (button) {
    button.setAttribute("aria-pressed", String(isDark));
    button.textContent = isDark ? "Світла тема" : "Темна тема";
  }
}

export function initializeTheme() {
  const saved = readStorage(THEME_KEY, null);
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(saved === "dark" || saved === "light" ? saved : preferred);
  document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    applyTheme(next);
    writeStorage(THEME_KEY, next);
  });
}
