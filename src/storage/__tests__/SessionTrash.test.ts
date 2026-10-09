import { describe, it, expect, vi } from "vitest";
import { SessionTrash } from "../SessionTrash";

function fixture() {
	const files = new Map<string, string>();
	const adapter = { exists: async (p: string) => files.has(p), read: async (p: string) => files.get(p)!, write: vi.fn(async (p: string, value: string) => { files.set(p, value); }) };
	const plugin = { app: { vault: { configDir: ".obsidian", adapter } }, manifest: { id: "chat-lab" }, peekSessionMessages: vi.fn() } as any;
	const session = { id: "original", title: "Keep me", messages: [{ id: "m1", role: "user", content: "Saved text" }], createdAt: 1, updatedAt: 2, contextItems: [], draft: "Unsent draft", modelOverrides: { p: "model" } } as any;
	return { files, adapter, plugin, session };
}

describe("SessionTrash", () => {
	it("keeps full messages, draft and model choices after a fresh instance loads", async () => {
		const { plugin, session } = fixture();
		await new SessionTrash(plugin).add(session);
		const restored = await new SessionTrash(plugin).list();
		expect(restored[0].session).toMatchObject(session);
		await new SessionTrash(plugin).remove(session.id);
		expect(await new SessionTrash(plugin).list()).toEqual([]);
	});
	it("hydrates unopened history before making its recovery copy", async () => {
		const { plugin, session } = fixture();
		plugin.peekSessionMessages.mockResolvedValue(session.messages);
		await new SessionTrash(plugin).add({ ...session, messages: [], hydrated: false, messageCount: 1 });
		expect((await new SessionTrash(plugin).list())[0].session.messages).toEqual(session.messages);
	});
	it("rejects incomplete hydration and write failures instead of permitting deletion", async () => {
		const { plugin, session, adapter } = fixture();
		plugin.peekSessionMessages.mockResolvedValue([]);
		await expect(new SessionTrash(plugin).add({ ...session, messages: [], hydrated: false, messageCount: 1 })).rejects.toThrow("not deleted");
		expect(adapter.write).not.toHaveBeenCalled();
		adapter.write.mockRejectedValueOnce(new Error("disk full"));
		await expect(new SessionTrash(plugin).add(session)).rejects.toThrow("disk full");
	});
	it("serializes writes from two chat panes without losing a recovery copy", async () => {
		const { plugin, session } = fixture();
		await Promise.all([new SessionTrash(plugin).add(session), new SessionTrash(plugin).add({ ...session, id: "second" })]);
		expect((await new SessionTrash(plugin).list()).map(e => e.session.id).sort()).toEqual(["original", "second"]);
	});
});
