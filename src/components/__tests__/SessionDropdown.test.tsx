import React from "react";
import { render, fireEvent, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import SessionDropdown from "../SessionDropdown";
vi.mock("../ObsidianIcon", () => ({ default: () => <span /> }));
afterEach(cleanup);
const session = (id: string, title: string, updatedAt: number) => ({ id, title, updatedAt, createdAt: updatedAt, messages: [], contextItems: [] });
function setup() {
	const props = { sessions: [session("a", "Zebra", 3), session("b", "Alpha", 1)], trash: [{ session: session("c", "Recovered", 2), deletedAt: 4 }], activeSessionId: "a", onSelect: vi.fn(), onDelete: vi.fn().mockResolvedValue(undefined), onRecover: vi.fn().mockResolvedValue(undefined), onOpen: vi.fn().mockResolvedValue(undefined) };
	render(<SessionDropdown {...props} />);
	fireEvent.click(screen.getByRole("button", { name: "Chats: Zebra" }));
	return props;
}
describe("SessionDropdown", () => {
	it("searches titles and orders chats without changing active session", () => {
		const props = setup();
		fireEvent.change(screen.getByRole("combobox", { name: "Sort chats" }), { target: { value: "title" } });
		expect(screen.getByRole("dialog").querySelectorAll(".labai-session-select span")[0].textContent).toBe("Alpha");
		fireEvent.change(screen.getByRole("textbox"), { target: { value: "zeb" } });
		expect(screen.queryByText("Alpha")).toBeNull();
		expect(props.onSelect).not.toHaveBeenCalled();
	});
	it("deletes and recovers using separate actions, refreshing trash on open", async () => {
		const props = setup();
		expect(props.onOpen).toHaveBeenCalledOnce();
		fireEvent.click(screen.getByRole("button", { name: "Delete Zebra" }));
		await waitFor(() => expect(props.onDelete).toHaveBeenCalledWith("a"));
		fireEvent.click(screen.getByRole("button", { name: "Deleted (1)" }));
		await waitFor(() => expect((screen.getByRole("button", { name: "Recover Recovered" }) as HTMLButtonElement).disabled).toBe(false));
		fireEvent.click(screen.getByRole("button", { name: "Recover Recovered" }));
		await waitFor(() => expect(props.onRecover).toHaveBeenCalledWith("c"));
	});
	it("shows failures and returns keyboard focus on Escape", async () => {
		const props = setup();
		props.onDelete.mockRejectedValueOnce(new Error("disk full"));
		fireEvent.click(screen.getByRole("button", { name: "Delete Zebra" }));
		await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("disk full"));
		fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(document.activeElement).toBe(screen.getByRole("button", { name: "Chats: Zebra" }));
	});
});
