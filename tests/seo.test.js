import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const files = fs.readdirSync(root).filter((file) => file.endsWith(".html"));
const domain = "https://kava-lab-boichuk.vercel.app";

function meta(html, attribute, value) {
  const expression = new RegExp(`<meta[^>]+${attribute}=["']${value}["'][^>]*>`, "i");
  return expression.test(html);
}

test("all HTML pages have consistent SEO metadata", () => {
  const titles = [];
  const descriptions = [];
  for (const file of files) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i);
    const title = html.match(/<title>([^<]+)<\/title>/i);
    const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i);
    assert.ok(canonical, `${file} has canonical`);
    assert.equal(canonical[1].startsWith(domain), true, `${file} canonical uses the production domain`);
    assert.ok(title?.[1], `${file} has a title`);
    assert.ok(description?.[1], `${file} has a description`);
    titles.push(title[1]);
    descriptions.push(description[1]);
    for (const property of ["og:title", "og:description", "og:image", "og:url", "og:type", "og:locale"]) {
      assert.equal(meta(html, "property", property), true, `${file} has ${property}`);
    }
    assert.equal(meta(html, "name", "twitter:card"), true, `${file} has twitter:card`);
  }
  assert.equal(new Set(titles).size, titles.length, "titles are unique");
  assert.equal(new Set(descriptions).size, descriptions.length, "descriptions are unique");
});
