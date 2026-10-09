import { afterEach, expect, it, vi } from "vitest";
vi.mock("obsidian", () => ({ Modal: class {}, Notice: class {}, Setting: class {}, requestUrl: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
it("managed builds reject downloads and installs before network or vault access", async () => {
	vi.stubGlobal("__AURI_MANAGED_BUILD__", true);
	const { PluginUpdater } = await import("./PluginUpdater");
	const updater = new PluginUpdater({} as any, "chat-lab");
	await expect(updater.downloadUpdate({} as any)).rejects.toThrow("Auri plugin workspace");
	await expect(updater.installUpdate("unused")).rejects.toThrow("Auri plugin workspace");
});
it("standalone builds do not assume managed packaging", async () => {
	const { MANAGED_BUILD } = await import("../managed-build");
	expect(MANAGED_BUILD).toBe(false);
});
