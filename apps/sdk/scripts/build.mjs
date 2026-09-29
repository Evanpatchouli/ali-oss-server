import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sdkRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(sdkRoot, "dist");
const tscPath = resolve(sdkRoot, "node_modules/typescript/bin/tsc");

await rm(distDir, { recursive: true, force: true });

for (const args of [
  ["-p", "tsconfig.json", "--emitDeclarationOnly"],
  ["-p", "tsconfig.cjs.json"],
]) {
  const result = spawnSync(process.execPath, [tscPath, ...args], {
    cwd: sdkRoot,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const cjsDir = resolve(distDir, "cjs");
await mkdir(cjsDir, { recursive: true });
await writeFile(
  resolve(distDir, "index.js"),
  'import sdk from "./cjs/index.js";\nexport const { AliOssServerSdk, createAliOssServerSdk, AliOssServerSdkError } = sdk;\n'
);
await writeFile(
  resolve(cjsDir, "package.json"),
  `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`
);
