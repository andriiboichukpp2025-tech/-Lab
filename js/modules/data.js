export async function loadJson(relativePath) {
  const url = new URL(relativePath, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Не вдалося завантажити ${relativePath}`);
  return response.json();
}
