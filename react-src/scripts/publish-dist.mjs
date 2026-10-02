import { cp, readdir, rm } from "node:fs/promises";
import path from "node:path";

const source = path.resolve("dist");
const target = path.resolve("..");

for (const entry of await readdir(source, { withFileTypes: true })) {
  await cp(path.join(source, entry.name), path.join(target, entry.name), {
    recursive: true,
    force: true,
  });
}

const sourceAssets = new Set(await readdir(path.join(source, "assets")));
for (const name of await readdir(path.join(target, "assets"))) {
  if (/^index-.*\.(js|css)$/.test(name) && !sourceAssets.has(name)) {
    await rm(path.join(target, "assets", name));
  }
}

console.log("Published verified dist into the GitHub Pages repository root.");
