import React, { useEffect, useRef, useState } from "react";
import { App, Menu, Modal } from "obsidian";
import { ChatSession } from "../types";
import ObsidianIcon from "./ObsidianIcon";

interface ChatTabBarProps {
	app?: App;
	sessions: ChatSession[];
	openSessionIds: string[];
	activeSessionId: string | null;
	onSelect: (sessionId: string) => void;
	onClose: (sessionId: string) => void;
	onCloseOthers: (sessionId: string) => void;
	onCloseToRight: (sessionId: string) => void;
	onRename: (sessionId: string, title: string) => void;
	tabTitleWidth?: number;
}

export class RenameSessionModal extends Modal {
	constructor(
		app: App,
		private initialTitle: string,
		private save: (title: string) => void,
	) {
		super(app);
	}
	onOpen() {
		this.setTitle("Rename session");
		const doc = this.contentEl.ownerDocument;
		const form = doc.createElement("form");
		form.className = "labai-rename-session";
		const label = doc.createElement("label");
		label.textContent = "Session title";
		const input = doc.createElement("input");
		input.type = "text";
		input.value = this.initialTitle;
		input.required = true;
		label.append(input);
		const actions = doc.createElement("div");
		actions.className = "labai-rename-actions";
		const cancel = doc.createElement("button");
		cancel.type = "button";
		cancel.textContent = "Cancel";
		cancel.onclick = () => this.close();
		const submit = doc.createElement("button");
		submit.type = "submit";
		submit.className = "mod-cta";
		submit.textContent = "Rename";
		input.oninput = () => {
			submit.disabled = !input.value.trim();
		};
		form.onsubmit = (event) => {
			event.preventDefault();
			const title = input.value.trim();
			if (!title) {
				input.focus();
				return;
			}
			this.save(title);
			this.close();
		};
		actions.append(cancel, submit);
		form.append(label, actions);
		this.contentEl.append(form);
		input.focus();
		input.select();
	}
	onClose() {
		this.contentEl.replaceChildren();
	}
}

/** Special tab IDs that don't correspond to sessions */
const SPECIAL_TABS = new Set<string>();

function isSpecialTab(id: string): boolean {
	return SPECIAL_TABS.has(id);
}

function getSpecialTabLabel(id: string): string {
	switch (id) {
		default:
			return id;
	}
}

/** A lightweight tab strip for sessions within one shared chat view. */
const ChatTabBar: React.FC<ChatTabBarProps> = ({
	app,
	sessions,
	openSessionIds,
	activeSessionId,
	onSelect,
	onClose,
	onCloseOthers,
	onCloseToRight,
	onRename,
	tabTitleWidth = 160,
}) => {
	const tabListRef = useRef<HTMLDivElement>(null);
	const [overflow, setOverflow] = useState({ left: false, right: false });

	// Build tab list including both sessions and special tabs
	const tabs = openSessionIds
		.map((id) => {
			if (isSpecialTab(id)) {
				return {
					id,
					type: "special" as const,
					label: getSpecialTabLabel(id),
				};
			}
			const session = sessions.find((s) => s.id === id);
			return session
				? {
						id,
						type: "session" as const,
						label: session.title || "New chat",
						session,
					}
				: null;
		})
		.filter(Boolean) as Array<
		| { id: string; type: "special"; label: string }
		| { id: string; type: "session"; label: string; session: ChatSession }
	>;

	const tabKey = tabs.map((tab) => tab.id).join("\0");
	useEffect(() => {
		const list = tabListRef.current;
		if (!list) return;
		const update = () =>
			setOverflow({
				left: list.scrollLeft > 1,
				right:
					list.scrollLeft + list.clientWidth < list.scrollWidth - 1,
			});
		const reveal = () => {
			const active = list.querySelector<HTMLElement>(
				'[aria-selected="true"]',
			)?.parentElement;
			if (active) {
				const bounds = list.getBoundingClientRect();
				const rect = active.getBoundingClientRect();
				if (rect.left < bounds.left)
					list.scrollLeft += rect.left - bounds.left;
				else if (rect.right > bounds.right)
					list.scrollLeft += rect.right - bounds.right;
			}
			update();
		};
		reveal();
		list.addEventListener("scroll", update, { passive: true });
		const observer =
			typeof ResizeObserver === "undefined"
				? null
				: new ResizeObserver(reveal);
		observer?.observe(list);
		return () => {
			list.removeEventListener("scroll", update);
			observer?.disconnect();
		};
	}, [activeSessionId, tabKey, tabTitleWidth]);
	const scrollTabs = (direction: number) => {
		const list = tabListRef.current;
		if (list)
			list.scrollLeft +=
				direction * Math.max(80, list.clientWidth * 0.75);
	};

	if (tabs.length === 0) return null;

	return (
		<div className="labai-tab-strip">
			{overflow.left && (
				<button
					className="labai-tab-scroll is-left"
					aria-label="Scroll sessions left"
					onClick={() => scrollTabs(-1)}
				>
					<ObsidianIcon icon="chevron-left" size={16} />
				</button>
			)}
			<div
				ref={tabListRef}
				className="chat-session-tabs"
				role="tablist"
				aria-label="Chat sessions"
				onWheel={(event) => {
					const list = event.currentTarget;
					if (
						list.scrollWidth > list.clientWidth &&
						Math.abs(event.deltaY) > Math.abs(event.deltaX)
					)
						list.scrollLeft += event.deltaY;
				}}
				style={
					{
						"--chat-tab-title-width": `${tabTitleWidth}px`,
					} as React.CSSProperties
				}
			>
				{tabs.map((tab) => {
					const active = tab.id === activeSessionId;
					const isSpecial = tab.type === "special";
					return (
						<div
							key={tab.id}
							className={`chat-session-tab${active ? " is-active" : ""}${isSpecial ? " is-special" : ""}`}
							role="presentation"
						>
							<button
								className="chat-session-tab-select"
								role="tab"
								aria-selected={active}
								tabIndex={
									active ||
									(!activeSessionId && tab.id === tabs[0].id)
										? 0
										: -1
								}
								onKeyDown={(event) => {
									const index = tabs.findIndex(
										(item) => item.id === tab.id,
									);
									const next =
										event.key === "ArrowRight"
											? (index + 1) % tabs.length
											: event.key === "ArrowLeft"
												? (index + tabs.length - 1) %
													tabs.length
												: event.key === "Home"
													? 0
													: event.key === "End"
														? tabs.length - 1
														: -1;
									if (next >= 0) {
										event.preventDefault();
										onSelect(tabs[next].id);
										tabListRef.current
											?.querySelectorAll<HTMLButtonElement>(
												'[role="tab"]',
											)
											[next]?.focus();
									}
									if (event.key === "Delete") {
										event.preventDefault();
										onClose(tab.id);
									}
								}}
								aria-label={tab.label}
								onClick={() => onSelect(tab.id)}
								title={tab.label}
								onContextMenu={(event) => {
									if (isSpecial) return;
									event.preventDefault();
									const menu = new Menu();
									menu.addItem((item) =>
										item
											.setTitle("Close tab")
											.setIcon("x")
											.onClick(() => onClose(tab.id)),
									);
									menu.addSeparator();
									menu.addItem((item) =>
										item
											.setTitle("Close other tabs")
											.setIcon("panel-right-close")
											.onClick(() =>
												onCloseOthers(tab.id),
											),
									);
									menu.addItem((item) =>
										item
											.setTitle("Close tabs to the right")
											.setIcon("chevrons-right")
											.onClick(() =>
												onCloseToRight(tab.id),
											),
									);
									menu.addSeparator();
									menu.addItem((item) =>
										item
											.setTitle("Rename session")
											.setDisabled(!app)
											.setIcon("pencil")
											.onClick(() => {
												if (app)
													new RenameSessionModal(
														app,
														tab.label,
														(title) =>
															onRename(
																tab.id,
																title,
															),
													).open();
											}),
									);
									menu.showAtMouseEvent(event.nativeEvent);
								}}
							>
								<span
									className="chat-session-tab-label"
									dir="ltr"
								>
									{tab.label}
								</span>
							</button>
							<button
								className="chat-session-tab-close"
								onClick={() => onClose(tab.id)}
								aria-label={`Close ${tab.label}`}
								title="Close tab"
							>
								<ObsidianIcon icon="x" size={13} />
							</button>
						</div>
					);
				})}
			</div>
			{overflow.right && (
				<button
					className="labai-tab-scroll is-right"
					aria-label="Scroll sessions right"
					onClick={() => scrollTabs(1)}
				>
					<ObsidianIcon icon="chevron-right" size={16} />
				</button>
			)}
		</div>
	);
};

export default ChatTabBar;
