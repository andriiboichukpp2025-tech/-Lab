export function formatPrice(cents) {
  return `${Math.round(cents / 100)} ₴`;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "long" }).format(new Date(date));
}
