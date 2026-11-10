import { readStorage, writeStorage } from "./storage.js";

const CART_KEY = "kavalab:cart:v1";

export function getCart() {
  const value = readStorage(CART_KEY, []);
  return Array.isArray(value) ? value : [];
}

export function saveCart(items) {
  return writeStorage(CART_KEY, items.slice(0, 50));
}

export function getCartCount() {
  return getCart().reduce((sum, item) => sum + (Number.isInteger(item.quantity) ? item.quantity : 0), 0);
}

export function updateCartCount() {
  const count = document.querySelector("[data-cart-count]");
  if (count) count.textContent = String(getCartCount());
}

export function addToCart(item) {
  const items = getCart();
  const existing = items.find((entry) => entry.id === item.id);
  if (existing) {
    existing.quantity = Math.min(20, existing.quantity + item.quantity);
  } else {
    items.push({ ...item, quantity: Math.min(20, item.quantity) });
  }
  saveCart(items);
  updateCartCount();
}
