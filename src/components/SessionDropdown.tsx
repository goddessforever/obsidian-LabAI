import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChatSession } from "../types";
import type { TrashedSession } from "../storage/SessionTrash";
import ObsidianIcon from "./ObsidianIcon";

interface Props {
	sessions: ChatSession[];
	trash: TrashedSession[];
	activeSessionId: string | null;
	onOpen?: () => Promise<void>;
	onSelect: (id: string) => void;
	onDelete: (id: string) => Promise<void>;
	onRecover: (id: string) => Promise<void>;
}

export default function SessionDropdown({ sessions, trash, activeSessionId, onOpen, onSelect, onDelete, onRecover }: Props) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState("recent");
	const [deleted, setDeleted] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [position, setPosition] = useState<React.CSSProperties>({});
	const trigger = useRef<HTMLButtonElement>(null);
	const popup = useRef<HTMLDivElement>(null);
	const input = useRef<HTMLInputElement>(null);
	const active = sessions.find(s => s.id === activeSessionId);
	const rows = useMemo(() => {
		const values = deleted ? trash.map(t => ({ ...t.session, updatedAt: t.deletedAt })) : sessions;
		const term = query.trim().toLocaleLowerCase();
		return values.filter(s => (s.title || "New chat").toLocaleLowerCase().includes(term))
			.slice().sort((a, b) => sort === "title" ? (a.title || "New chat").localeCompare(b.title || "New chat") :
				sort === "oldest" ? a.createdAt - b.createdAt : b.updatedAt - a.updatedAt);
	}, [sessions, trash, deleted, query, sort]);
	useEffect(() => {
		if (!open || !trigger.current) return;
		const doc = trigger.current.ownerDocument;
		const win = doc.defaultView!;
		const place = () => {
			const rect = trigger.current!.getBoundingClientRect();
			const viewport = win.visualViewport;
			const width = Math.min(360, (viewport?.width ?? win.innerWidth) - 24);
			const left = Math.max((viewport?.offsetLeft ?? 0) + 12, Math.min(rect.left, (viewport?.offsetLeft ?? 0) + (viewport?.width ?? win.innerWidth) - width - 12));
			const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? win.innerHeight);
			const top = Math.min(rect.bottom + 6, bottom - 160);
			setPosition({ position: "fixed", width, left, top: Math.max(12, top), maxHeight: Math.max(120, bottom - Math.max(12, top) - 12) });
		};
		const outside = (event: PointerEvent) => {
			if (!popup.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
		};
		place(); input.current?.focus();
		doc.addEventListener("pointerdown", outside);
		win.addEventListener("resize", place);
		win.addEventListener("scroll", place, true);
		win.visualViewport?.addEventListener("resize", place);
		win.visualViewport?.addEventListener("scroll", place);
		return () => { doc.removeEventListener("pointerdown", outside); win.removeEventListener("resize", place); win.removeEventListener("scroll", place, true); win.visualViewport?.removeEventListener("resize", place); win.visualViewport?.removeEventListener("scroll", place); };
	}, [open]);
	const run = async (action: () => Promise<void>) => {
		setBusy(true); setError("");
		try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Could not update chat"); }
		finally { setBusy(false); }
	};
	return <>
		<button ref={trigger} type="button" className="chat-btn labai-session-trigger" aria-label={`Chats: ${active?.title || "New chat"}`} title="Chats" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setOpen(!open); if (!open) void onOpen?.().catch(e => setError(String(e))); }}>
			<ObsidianIcon icon="messages-square" size={17} /><span>{active?.title || "Chats"}</span><ObsidianIcon icon="chevron-down" size={12} />
		</button>
		{open && trigger.current && createPortal(<div className="labai-session-dropdown" ref={popup} role="dialog" aria-label="Chats" style={position} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); setOpen(false); trigger.current?.focus(); } }}>
			<div className="labai-session-filters"><input ref={input} aria-label="Search chats" placeholder="Search chat titles…" value={query} onChange={e => setQuery(e.target.value)} />
			<select aria-label="Sort chats" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Recently updated</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></div>
			<div className="labai-session-modes"><button type="button" aria-pressed={!deleted} onClick={() => setDeleted(false)}>Chats ({sessions.length})</button><button type="button" aria-pressed={deleted} onClick={() => setDeleted(true)}>Deleted ({trash.length})</button></div>
			{error && <div role="alert">{error}</div>}
			<div className="labai-session-list">{rows.map(s => <div className={`labai-session-row${s.id === activeSessionId ? " is-active" : ""}`} key={s.id}>
				<button className="labai-session-select" type="button" disabled={deleted || busy} aria-current={s.id === activeSessionId ? "true" : undefined} onClick={() => { onSelect(s.id); setOpen(false); trigger.current?.focus(); }}><span>{s.title || "New chat"}</span><small>{new Date(s.updatedAt).toLocaleDateString()}</small></button>
				<button type="button" disabled={busy} aria-label={`${deleted ? "Recover" : "Delete"} ${s.title || "New chat"}`} title={deleted ? "Recover chat" : "Move to deleted chats"} onClick={() => void run(() => deleted ? onRecover(s.id) : onDelete(s.id))}><ObsidianIcon icon={deleted ? "undo-2" : "trash-2"} size={16} /></button>
			</div>)}{rows.length === 0 && <p>{query ? "No matching chats" : deleted ? "No deleted chats" : "No chats yet"}</p>}</div>
			{deleted && <small className="labai-session-hint">Deleted chats stay here on this device until recovered.</small>}
		</div>, trigger.current.ownerDocument.body)}
	</>;
}
