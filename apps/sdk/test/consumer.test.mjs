import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sdkDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageName = "@ali-oss-server/sdk";
const temporaryRoot = await mkdtemp(join(tmpdir(), "ali-oss-sdk-consumer-"));
const scratchDirectory = join(temporaryRoot, "consumer workspace");
await mkdir(scratchDirectory);

function npmCommand(args, options = {}) {
  if (process.platform !== "win32") return run("npm", args, options);

  for (const pathDirectory of (process.env.PATH ?? "").split(delimiter)) {
    const npmCliPath = join(
      pathDirectory,
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js"
    );
    if (existsSync(npmCliPath))
      return run(process.execPath, [npmCliPath, ...args], options);
  }

  throw new Error(
    "Could not locate npm-cli.js beside an npm.cmd directory on PATH"
  );
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
  });

  if (result.error) throw result.error;
  assert.equal(
    result.status,
    0,
    `${command} ${args.map((arg) => JSON.stringify(arg)).join(" ")} failed\n${result.stdout}\n${result.stderr}`
  );
  return result.stdout;
}

test("published tarball supports ESM, CommonJS, and NodeNext declarations", async (t) => {
  t.after(async () => rm(temporaryRoot, { recursive: true, force: true }));

  const packOutput = npmCommand(
    ["pack", "--json", "--pack-destination", scratchDirectory],
    { cwd: sdkDirectory }
  );
  const [packResult] = JSON.parse(packOutput);
  const tarballPath = join(scratchDirectory, packResult.filename);
  const packedFiles = new Set(packResult.files.map(({ path }) => path));
  const consumerDirectory = join(scratchDirectory, "installed consumer");
  await mkdir(consumerDirectory);
  await writeFile(
    join(consumerDirectory, "package.json"),
    JSON.stringify({
      name: "sdk-consumer-smoke",
      private: true,
      type: "module",
    })
  );
  npmCommand(
    [
      "install",
      "--no-audit",
      "--no-fund",
      "--ignore-scripts",
      "--no-save",
      tarballPath,
    ],
    { cwd: consumerDirectory }
  );

  const installedDirectory = join(
    consumerDirectory,
    "node_modules",
    ...packageName.split("/")
  );
  const packageJson = JSON.parse(
    await readFile(join(installedDirectory, "package.json"), "utf8")
  );
  const rootExport = packageJson.exports?.["."];
  assert.ok(rootExport, "package root export is required");

  const importTarget = rootExport.import?.default ?? rootExport.import;
  const requireTarget = rootExport.require?.default ?? rootExport.require;
  const importTypes =
    rootExport.import?.types ?? rootExport.types ?? packageJson.types;
  const requireTypes =
    rootExport.require?.types ?? rootExport.types ?? packageJson.types;
  for (const [condition, target] of [
    ["import runtime", importTarget],
    ["require runtime", requireTarget],
    ["import declarations", importTypes],
    ["require declarations", requireTypes],
  ]) {
    assert.equal(
      typeof target,
      "string",
      `${condition} target must be declared`
    );
    assert.ok(
      packedFiles.has(target.replace(/^\.\//, "")),
      `${condition} target must be in tarball`
    );
  }

  assert.ok(
    packedFiles.has(`${requireTarget.replace(/^\.\//, "")}.map`),
    `source map for CommonJS implementation ${requireTarget} must be in tarball`
  );
  for (const target of new Set([importTypes, requireTypes])) {
    assert.ok(
      packedFiles.has(`${target.replace(/^\.\//, "")}.map`),
      `declaration map for ${target} must be in tarball`
    );
  }

  const esmPath = join(consumerDirectory, "consumer.mjs");
  await writeFile(
    esmPath,
    `import assert from "node:assert/strict";\nimport { AliOssServerSdk, createAliOssServerSdk, AliOssServerSdkError } from "${packageName}";\nassert.equal(typeof AliOssServerSdk, "function");\nassert.equal(typeof createAliOssServerSdk, "function");\nassert.equal(typeof AliOssServerSdkError, "function");\n`
  );
  run(process.execPath, [esmPath], { cwd: consumerDirectory });

  const cjsPath = join(consumerDirectory, "consumer.cjs");
  await writeFile(
    cjsPath,
    `const assert = require("node:assert/strict");\nconst { AliOssServerSdk, createAliOssServerSdk, AliOssServerSdkError } = require("${packageName}");\nassert.equal(typeof AliOssServerSdk, "function");\nassert.equal(typeof createAliOssServerSdk, "function");\nassert.equal(typeof AliOssServerSdkError, "function");\n`
  );
  run(process.execPath, [cjsPath], { cwd: consumerDirectory });

  const mixedPath = join(consumerDirectory, "mixed-modules.mjs");
  await writeFile(
    mixedPath,
    `import assert from "node:assert/strict";\nimport { createRequire } from "node:module";\nimport * as esm from "${packageName}";\nconst require = createRequire(import.meta.url);\nconst cjs = require("${packageName}");\nfor (const name of ["AliOssServerSdk", "createAliOssServerSdk", "AliOssServerSdkError"]) {\n  assert.equal(typeof esm[name], "function", "ESM export " + name + " must be callable");\n  assert.equal(esm[name], cjs[name], name + " must share identity across entry points");\n}\nconst options = { serverBaseUrl: "http://localhost:9512", clientId: "client", clientSecret: "secret" };\nassert.ok(new esm.AliOssServerSdk(options) instanceof cjs.AliOssServerSdk);\nassert.ok(new cjs.AliOssServerSdk(options) instanceof esm.AliOssServerSdk);\nassert.ok(esm.createAliOssServerSdk(options) instanceof cjs.AliOssServerSdk);\nassert.ok(cjs.createAliOssServerSdk(options) instanceof esm.AliOssServerSdk);\nconst esmError = new esm.AliOssServerSdkError("esm failure");\nconst cjsError = new cjs.AliOssServerSdkError("cjs failure");\nassert.ok(esmError instanceof cjs.AliOssServerSdkError);\nassert.ok(cjsError instanceof esm.AliOssServerSdkError);\nassert.ok(esmError instanceof Error);\nassert.ok(cjsError instanceof Error);\n`
  );
  run(process.execPath, [mixedPath], { cwd: consumerDirectory });

  const esmTypesPath = join(consumerDirectory, "consumer.mts");
  const cjsTypesPath = join(consumerDirectory, "consumer.cts");
  await writeFile(
    esmTypesPath,
    `import { AliOssServerSdk, createAliOssServerSdk, AliOssServerSdkError } from "${packageName}";\nimport type { AliOssServerSdkOptions } from "${packageName}";\nconst options: AliOssServerSdkOptions = { serverBaseUrl: "http://localhost:9512", clientId: "client", clientSecret: "secret" };\nconst sdk: AliOssServerSdk = createAliOssServerSdk(options);\nconst error: AliOssServerSdkError = new AliOssServerSdkError("failure");\nvoid sdk; void error;\n`
  );
  await writeFile(
    cjsTypesPath,
    `import sdk = require("${packageName}");\nimport type { AliOssServerSdkOptions } from "${packageName}";\nconst options: AliOssServerSdkOptions = { serverBaseUrl: "http://localhost:9512", clientId: "client", clientSecret: "secret" };\nconst client: sdk.AliOssServerSdk = sdk.createAliOssServerSdk(options);\nconst error: sdk.AliOssServerSdkError = new sdk.AliOssServerSdkError("failure");\nvoid client; void error;\n`
  );

  const tscPath = join(
    sdkDirectory,
    "node_modules",
    "typescript",
    "bin",
    "tsc"
  );
  run(
    process.execPath,
    [
      tscPath,
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      esmTypesPath,
      cjsTypesPath,
    ],
    { cwd: consumerDirectory }
  );
});
