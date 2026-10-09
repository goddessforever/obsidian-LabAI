import type { ChatPluginLike } from "../views/ObsidianAIChatView";
import type { ChatSession } from "../types";

export interface TrashedSession { session: ChatSession; deletedAt: number }

const queues = new WeakMap<object, Promise<unknown>>();

/** Local recovery copies are deliberately separate from synced deletion tombstones. */
export class SessionTrash {
	constructor(private plugin: ChatPluginLike) {}
	private get path() {
		return `${this.plugin.app.vault.configDir}/plugins/${this.plugin.manifest.id}/session-trash.json`;
	}
	async list(): Promise<TrashedSession[]> {
		const adapter = this.plugin.app.vault.adapter;
		if (!(await adapter.exists(this.path))) return [];
		const entries = JSON.parse(await adapter.read(this.path));
		if (!Array.isArray(entries)) throw new Error("Invalid chat recovery data");
		return entries;
	}
	private update(change: (entries: TrashedSession[]) => TrashedSession[]) {
		const operation = (queues.get(this.plugin) ?? Promise.resolve()).then(async () => {
			const entries = change(await this.list());
			await this.plugin.app.vault.adapter.write(this.path, JSON.stringify(entries));
			return entries;
		});
		queues.set(this.plugin, operation.catch(() => undefined));
		return operation;
	}
	async add(session: ChatSession) {
		let messages = session.messages;
		if (session.hydrated === false) {
			messages = await this.plugin.peekSessionMessages?.(session.id) ??
				await this.plugin.hydrateSession?.(session.id) ?? [];
			if (messages.length < (session.messageCount ?? 0))
				throw new Error("Chat messages could not be fully loaded; chat was not deleted");
		}
		const copy = JSON.parse(JSON.stringify({ ...session, messages, hydrated: true }));
		return this.update(entries => [{ session: copy, deletedAt: Date.now() },
			...entries.filter(entry => entry.session.id !== session.id)]);
	}
	remove(id: string) { return this.update(entries => entries.filter(entry => entry.session.id !== id)); }
}
