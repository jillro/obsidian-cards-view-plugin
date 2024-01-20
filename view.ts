import {
	ItemView,
	MarkdownRenderer,
	Menu,
	setIcon,
	TAbstractFile,
	TFile,
	TFolder,
	WorkspaceLeaf,
} from "obsidian";
import Masonry from "masonry-layout";
import { CardsViewSettings } from "./settings";

export const VIEW_TYPE = "cards-view-plugin";

enum Sort {
	Created = "ctime",
	Modified = "mtime",
}

export class CardsViewPluginView extends ItemView {
	private cardContainer: HTMLElement;
	private notesGrid: Masonry;
	private nextCardIndex = 0;
	private settings: CardsViewSettings;
	private sort: Sort = Sort.Modified;

	constructor(settings: CardsViewSettings, leaf: WorkspaceLeaf) {
		super(leaf);
		this.settings = settings;
	}

	getViewType() {
		return VIEW_TYPE;
	}

	getDisplayText() {
		return this.app.vault.getName();
	}

	// Get all notes recursively in a flat array
	async getNotes(folder: TFolder): Promise<TFile[]> {
		const notes: TFile[] = [];
		for (const file of folder.children) {
			if (file instanceof TFolder) {
				notes.push(...(await this.getNotes(file)));
			} else if (file instanceof TFile && file.extension === "md") {
				notes.push(file);
			}
		}

		return notes;
	}

	async getFileStringId(filename: string): Promise<string> {
		const buffer = await crypto.subtle.digest(
			"SHA-1",
			new TextEncoder().encode(filename),
		);
		// convert buffer to hexa string
		const hash = Array.from(new Uint8Array(buffer))
			.map((x: number) => ("00" + x.toString(16)).slice(-2))
			.join("");
		return `note-${hash}`;
	}

	async renderCard(file: TFile, div: HTMLElement) {
		div.createEl("h3", { text: file.basename });

		const content = await this.app.vault.cachedRead(file);
		// get first 10 lines of the file
		const tenLines = content.split("\n").slice(0, 10).join("\n");
		const summary = `${tenLines.length < 200 ? tenLines : content.slice(0, 200)}${content.length > 200 ? " ..." : ""}`;
		await MarkdownRenderer.render(this.app, summary, div, file.path, this);

		const cardInfo = div.createEl("div", { cls: "card-info" });

		const parentFolder = file.parent as TFolder;
		if (parentFolder.path !== "/") {
			setIcon(cardInfo, "folder");
			cardInfo.createEl("span", {
				text: `${parentFolder.path}/`,
				cls: "folder-name",
			});
		}

		const trashButton = cardInfo.createEl("div", { cls: "clickable-icon" });
		setIcon(trashButton, "trash");
		trashButton.addEventListener("click", async (e: MouseEvent) => {
			e.stopPropagation();
			const eventTarget = e.target as HTMLElement;
			this.notesGrid?.remove?.([
				eventTarget.parentElement?.parentElement?.parentElement,
			]);
			this.notesGrid?.layout?.();
			await this.app.vault.trash(file, true);
		});
	}

	async addCard(file: TFile, prepend = false) {
		// id is a hash of the file path
		const div = createEl("div", {
			cls: `card ${await this.getFileStringId(file.path)}`,
		});
		await this.renderCard(file, div);

		div.addEventListener("click", () => {
			this.app.workspace.getLeaf("tab").openFile(file);
		});
		this.cardContainer.appendChild(div);
		this.notesGrid[prepend ? "prepended" : "appended"]?.([div]);
	}

	async getCard(file: TFile) {
		return this.cardContainer.querySelector(`#${file.basename}`);
	}

	async loadFolder(folder: TFolder) {
		this.cardContainer.empty();
		this.notesGrid?.reloadItems?.();

		const files = (await this.getNotes(folder)).sort(
			(a: TFile, b: TFile) => b.stat[this.sort] - a.stat[this.sort],
		);

		for (
			this.nextCardIndex = 0;
			this.nextCardIndex < 50;
			this.nextCardIndex++
		) {
			const file = files[this.nextCardIndex];
			if (!file) break;
			await this.addCard(file);
		}

		// TODO search + button plus + épingler et couleurs
		// Extension commander et omnisearch
	}

	async onOpen() {
		const viewContent = this.containerEl.children[1];
		const actionBar = viewContent.createEl("div", {
			cls: "cards-view-action-bar",
		});
		const sortButton = actionBar.createEl("div", {
			cls: "clickable-icon",
		});
		setIcon(sortButton, "arrow-down-wide-narrow");
		sortButton.addEventListener("click", (event) => {
			const sortMenu = new Menu();
			sortMenu.addItem((item) => {
				item.setTitle("Last created");
				item.setChecked(this.sort == Sort.Created);
				item.onClick(async () => {
					this.sort = Sort.Created;
					await this.loadFolder(this.app.vault.getRoot());
				});
			});
			sortMenu.addItem((item) => {
				item.setTitle("Last modified");
				item.setChecked(this.sort == Sort.Modified);
				item.onClick(async () => {
					this.sort = Sort.Modified;
					await this.loadFolder(this.app.vault.getRoot());
				});
			});
			sortMenu.showAtMouseEvent(event);
		});

		this.cardContainer = viewContent.createEl("div", {
			cls: "cards-view-main",
		});
		this.notesGrid = new Masonry(this.cardContainer, {
			itemSelector: ".card",
			gutter: 20,
			transitionDuration: 0,
			containerStyle: {
				width: "100%",
			},
		});
		const observer = new ResizeObserver(() => {
			const columns = Math.floor(
				viewContent.clientWidth / this.settings.minCardWidth,
			);
			this.cardContainer.style.setProperty(
				"--columns",
				columns.toString(),
			);
			this.notesGrid?.layout?.();
		});
		observer.observe(this.cardContainer);

		const root = this.app.vault.getRoot();
		await this.loadFolder(root);
		this.registerEvent(
			this.app.vault.on("create", async (file: TFile) => {
				if (file.extension === "md") {
					await this.addCard(file, true);
					this.notesGrid?.layout?.();
					this.nextCardIndex++;
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("delete", async (file: TAbstractFile) => {
				if (file instanceof TFile && file.extension === "md") {
					const element = document.getElementsByClassName(
						await this.getFileStringId(file.path),
					)[0];
					this.notesGrid?.remove?.([element]);
					this.notesGrid?.layout?.();
					this.nextCardIndex--;
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("modify", async (file: TFile) => {
				if (file.extension === "md") {
					const element = document.getElementsByClassName(
						await this.getFileStringId(file.path),
					)[0];
					element.empty();
					await this.renderCard(file, element as HTMLElement);
					this.notesGrid?.layout?.();
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on(
				"rename",
				async (file: TFile, oldPath: string) => {
					if (file.extension === "md") {
						const oldClass = await this.getFileStringId(oldPath);
						const element =
							document.getElementsByClassName(oldClass)[0];
						element.className = element.className.replace(
							oldClass,
							await this.getFileStringId(file.path),
						);
						element.empty();
						await this.renderCard(file, element as HTMLElement);
						this.notesGrid?.layout?.();
					}
				},
			),
		);

		let loading = false;
		// On scroll 80% of viewContent, load more cards
		viewContent.addEventListener("scroll", async () => {
			if (loading) return;
			if (
				viewContent.scrollTop + viewContent.clientHeight <
				viewContent.scrollHeight - 500
			)
				return;

			loading = true;
			const files = (await this.getNotes(root)).sort(
				(a: TFile, b: TFile) => b.stat.mtime - a.stat.mtime,
			);
			for (let i = this.nextCardIndex; i < this.nextCardIndex + 50; i++) {
				const file = files[i];
				if (!file) break;
				await this.addCard(file);
			}
			this.nextCardIndex += 50;
			loading = false;
		});
	}

	async onClose() {
		//
	}
}
