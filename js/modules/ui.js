export function setMessage(element, message, type = "info") {
  if (!element) return;
  element.textContent = message;
  element.dataset.state = type;
}

export function getPageName() {
  return window.location.pathname.split("/").pop() || "index.html";
}
