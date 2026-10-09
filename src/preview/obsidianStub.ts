export const setIcon = (target: HTMLElement, icon: string): void => {
	target.textContent = "•";
	target.title = icon;
	target.setCssStyles({ overflow: "hidden", fontSize: "12px" });
	target.setAttribute("aria-hidden", "true");
};

export class Menu {
	addItem(callback: (item: any) => void): this {
		callback({
			setTitle: () => this,
			setIcon: () => this,
			onClick: () => this,
		});
		return this;
	}
	addSeparator(): this {
		return this;
	}
	showAtMouseEvent(): void {}
}

export class Notice {
	constructor(public message: string) {
		console.info("[Preview notice]", message);
	}
}

export class TFile {
	constructor(public path = "fixture.md") {}
}

export class TFolder {
	constructor(public path = "") {}
}

export const Platform = { isMobile: false };

export const requestUrl = async (..._args: unknown[]): Promise<any> => {
	throw new Error("requestUrl is not available in the preview sandbox");
};

export class MarkdownView {}

export class Modal {
	modalEl = document.createElement("div");
	titleEl = document.createElement("h2");
	contentEl = document.createElement("div");
	constructor(public app: unknown) {
		this.modalEl.className = "modal";
		this.modalEl.append(this.titleEl, this.contentEl);
	}
	onOpen(): void {}
	onClose(): void {}
	setTitle(title: string): this { this.titleEl.textContent = title; return this; }
	open(): void { document.body.append(this.modalEl); this.onOpen(); }
	close(): void { this.onClose(); this.modalEl.remove(); }
}
