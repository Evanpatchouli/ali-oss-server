import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export const workspaceRoot = path.resolve(currentDirectory, "../../../../");
export const workspaceEnvFilePath = path.join(workspaceRoot, ".env");
export const runtimeStateDirectory = path.join(workspaceRoot, "data");
export const runtimeStateFilePath = path.join(runtimeStateDirectory, "runtime-state.json");
export const adminDistDirectory = path.join(workspaceRoot, "apps", "admin", "dist");
export const adminIndexHtmlPath = path.join(adminDistDirectory, "index.html");
