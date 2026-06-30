import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    base: "/admin/",
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/api": "http://localhost:9512",
            "/health": "http://localhost:9512",
        },
    },
});
