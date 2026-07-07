import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const versionMetadata = createVersionMetadata();
export default defineConfig({
    base: "/admin/",
    plugins: [react(), versionMetadata.htmlPlugin],
    define: versionMetadata.defines,
    server: {
        port: 5173,
        proxy: {
            "/api": "http://localhost:9512",
            "/health": "http://localhost:9512",
        },
    },
});
function createVersionMetadata() {
    const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
    const gitHash = readGitHash();
    const appVersion = {
        version: packageJson.version ?? "0.0.0",
        buildTime: new Date().toISOString(),
        gitHash,
    };
    const appName = packageJson.name ?? "admin";
    const changelog = readChangelog();
    return {
        defines: {
            __APP_CHANGELOG__: JSON.stringify(changelog),
            __APP_NAME__: JSON.stringify(appName),
            __APP_VERSION__: JSON.stringify(appVersion),
            __GIT_SHA__: JSON.stringify(gitHash),
        },
        htmlPlugin: {
            name: "admin-version-metadata",
            transformIndexHtml() {
                return [
                    { tag: "meta", attrs: { name: "app-name", content: appName } },
                    {
                        tag: "meta",
                        attrs: { name: "app-version", content: appVersion.version },
                    },
                    { tag: "meta", attrs: { name: "git-sha", content: gitHash } },
                    {
                        tag: "meta",
                        attrs: { name: "build-time", content: appVersion.buildTime },
                    },
                ];
            },
        },
    };
}
function readGitHash() {
    try {
        return execSync("git rev-parse --short HEAD", {
            cwd: new URL("../..", import.meta.url),
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    }
    catch {
        return "unknown";
    }
}
function readChangelog() {
    try {
        return readFileSync(new URL("../../CHANGELOG.md", import.meta.url), "utf8");
    }
    catch {
        return "";
    }
}
