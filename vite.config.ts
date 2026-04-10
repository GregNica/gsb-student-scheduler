import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

export default defineConfig({
    plugins: [sveltekit(), tailwindcss()],
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    server: {
        host: "0.0.0.0",
    },
    build: {
        assetsInlineLimit: Infinity,
    },
    ssr: {
        noExternal: true,
    },
});
