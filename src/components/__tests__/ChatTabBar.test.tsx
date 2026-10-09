import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatTabBar, { RenameSessionModal } from "../ChatTabBar";
import type { App } from "obsidian";
import type { ChatSession } from "../../types";

const longTitle = "Other Words and HelloChinese Programming Vocabulary";

function session(id: string, title: string): ChatSession {
	return {
		id,
		title,
		createdAt: 1,
		updatedAt: 1,
		messages: [],
		contextItems: [],
	};
}

describe("ChatTabBar", () => {
	it("puts the complete session title on the tab button, not the tab list", () => {
		render(
			<ChatTabBar
				sessions={[session("one", longTitle)]}
				openSessionIds={["one"]}
				activeSessionId="one"
				onSelect={vi.fn()}
				onClose={vi.fn()}
				onCloseOthers={vi.fn()}
				onCloseToRight={vi.fn()}
				onRename={vi.fn()}
			/>,
		);

		const tab = screen.getByRole("tab", { name: longTitle });
		expect(tab.getAttribute("title")).toBe(longTitle);
		expect(screen.getByRole("tablist").getAttribute("aria-label")).toBe(
			"Chat sessions",
		);
	});

	it("keeps a close control when there is only one tab", () => {
		const onClose = vi.fn();
		render(
			<ChatTabBar
				sessions={[session("one", "One chat")]}
				openSessionIds={["one"]}
				activeSessionId="one"
				onSelect={vi.fn()}
				onClose={onClose}
				onCloseOthers={vi.fn()}
				onCloseToRight={vi.fn()}
				onRename={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Close One chat" }));
		expect(onClose).toHaveBeenCalledWith("one");
	});
});

function tabProps() {
	return {
		sessions: [
			session("one", "First"),
			session("two", "Second"),
			session("three", "Third"),
		],
		openSessionIds: ["one", "two", "three"],
		activeSessionId: "one",
		onSelect: vi.fn(),
		onClose: vi.fn(),
		onCloseOthers: vi.fn(),
		onCloseToRight: vi.fn(),
		onRename: vi.fn(),
	};
}
it("supports roving keyboard selection and deleting the focused tab", () => {
	const props = tabProps();
	render(<ChatTabBar {...props} />);
	const first = screen.getByRole("tab", { name: "First" });
	expect(first.tabIndex).toBe(0);
	expect(screen.getByRole("tab", { name: "Second" }).tabIndex).toBe(-1);
	fireEvent.keyDown(first, { key: "End" });
	expect(props.onSelect).toHaveBeenLastCalledWith("three");
	expect(document.activeElement).toBe(
		screen.getByRole("tab", { name: "Third" }),
	);
	fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
	expect(props.onSelect).toHaveBeenLastCalledWith("one");
	fireEvent.keyDown(first, { key: "Delete" });
	expect(props.onClose).toHaveBeenCalledWith("one");
});
it("reveals the active session instead of resetting restored tabs to the beginning", () => {
	const props = tabProps();
	const { rerender } = render(<ChatTabBar {...props} />);
	const list = screen.getByRole("tablist");
	const third = screen.getByRole("tab", { name: "Third" }).parentElement!;
	vi.spyOn(list, "getBoundingClientRect").mockReturnValue({
		left: 0,
		right: 200,
	} as DOMRect);
	vi.spyOn(third, "getBoundingClientRect").mockReturnValue({
		left: 320,
		right: 480,
	} as DOMRect);
	rerender(<ChatTabBar {...props} activeSessionId="three" />);
	expect(list.scrollLeft).toBe(280);
});
it("renames through a native modal and rejects empty titles", () => {
	const save = vi.fn();
	const modal = new RenameSessionModal({} as App, "Original", save);
	// The shared Obsidian mock has no contentEl implementation.
	Object.defineProperty(modal, "contentEl", {
		value: document.createElement("div"),
	});
	const close = vi.spyOn(modal, "close");
	modal.onOpen();
	const input = modal.contentEl.querySelector("input")!;
	const form = modal.contentEl.querySelector("form")!;
	input.value = "   ";
	fireEvent.submit(form);
	expect(save).not.toHaveBeenCalled();
	input.value = "  Renamed  ";
	fireEvent.submit(form);
	expect(save).toHaveBeenCalledWith("Renamed");
	expect(close).toHaveBeenCalledOnce();
});
