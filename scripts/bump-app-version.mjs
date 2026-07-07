#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const version = process.argv[2];

if (!version || !isValidSemver(version)) {
  console.error("Usage: pnpm version:app <version>");
  console.error("Example: pnpm version:app 1.0.1");
  process.exit(1);
}

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const targetPackages = ["apps/admin/package.json", "apps/server/package.json"];

for (const relativePath of targetPackages) {
  const packagePath = path.join(rootDirectory, relativePath);
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  const previousVersion = packageJson.version;
  packageJson.version = version;
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log(`${relativePath}: ${previousVersion} -> ${version}`);
}

console.log(
  "Skipped apps/sdk/package.json because SDK releases are independent."
);

function isValidSemver(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(
    value
  );
}
