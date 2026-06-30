import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export const workspaceRoot = path.resolve(currentDirectory, "../../../../");
export const workspaceEnvFilePath = path.join(workspaceRoot, ".env");
export const adminDistDirectory = path.join(workspaceRoot, "apps", "admin", "dist");
export const adminIndexHtmlPath = path.join(adminDistDirectory, "index.html");
