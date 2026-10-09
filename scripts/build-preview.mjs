import { build } from "esbuild";
import { mkdir, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";

await mkdir("preview-dist", { recursive: true });
await build({
	entryPoints: ["src/preview/main.tsx"],
	bundle: true,
	format: "iife",
	platform: "browser",
	outfile: "preview-dist/preview.js",
	loader: { ".tsx": "tsx", ".ts": "ts" },
	alias: {
		obsidian: fileURLToPath(new URL("../src/preview/obsidianStub.ts", import.meta.url)),
	},
	sourcemap: true,
});
await cp("preview/index.html", "preview-dist/index.html");
console.log("Preview built in preview-dist/");
