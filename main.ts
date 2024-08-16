import {
	Plugin,
	WorkspaceLeaf,
	TFolder,
	TFile,
	Notice,
	MarkdownView,
} from "obsidian";
import {
	type CardsViewSettings,
	CardsViewSettingsTab,
	DEFAULT_SETTINGS,
} from "./settings";
import { CardsViewPluginView, VIEW_TYPE } from "./view";
import store from "./components/store";

export default class CardsViewPlugin extends Plugin {
	settings: CardsViewSettings = Object.assign({}, DEFAULT_SETTINGS);

	async onload() {
		this.settings = Object.assign(this.settings, await this.loadData());
		this.addSettingTab(new CardsViewSettingsTab(this.app, this));

		this.addRibbonIcon("align-start-horizontal", "Card view", () => {
			this.activateView();
		});

		this.addCommand({
			id: "cards-view-plugin",
			name: "Open card view",
			callback: () => {
				this.activateView();
			},
		});

		this.registerView(
			VIEW_TYPE,
			(leaf) => new CardsViewPluginView(this.settings, leaf),
		);

		this.app.workspace.onLayoutReady(() => {
			if (this.settings.launchOnStart) {
				this.activateView();
			}
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFolder) {
					menu.addItem((item) => {
						item
							.setTitle("Open Folder in Cards View")
							.setIcon("documents")
							.onClick(() => this.openAllFilesInFolder(file));
					});
				}
			}),
		);

		// 添加标签点击事件监听器
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			if (this.settings.openCardsViewOnTagClick) {
				const target = evt.target as HTMLElement;
				console.log(
					"registerDomEvent",
					target,
					target.classList.contains("tree-item-self"),
				);

				let tagElement = target.closest(".tree-item-self.tag-pane-tag");
				if (tagElement) {
					const textElement = tagElement.querySelector(".tree-item-inner-text");
					if (textElement) {
						const tagName = textElement.textContent?.trim();
						console.log("tagName", tagName);
						if (tagName) {
							this.openTagInCardsView(tagName);
							evt.preventDefault();
						}
					}
				}
			}
		});
	}

	onunload() {}

	async activateView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE);
		if (leaves.length) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getLeaf("tab");
		}
		await leaf.setViewState({ type: VIEW_TYPE, active: true });
		store.viewIsVisible.set(true);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async openAllFilesInFolder(folder: TFolder) {
		const files = folder.children.filter(
			(child): child is TFile =>
				child instanceof TFile && child.extension === "md",
		);
		await this.activateView();
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
		if (leaves.length > 0) {
			const cardsView = leaves[0].view as CardsViewPluginView;
			cardsView.updateFiles(files);
		}
	}

	async openTagInCardsView(tagName: string) {
		try {
			const files = await this.getFilesWithTag(tagName);
			await this.activateView();
			const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
			if (leaves.length > 0) {
				const cardsView = leaves[0].view as CardsViewPluginView;
				cardsView.updateFiles(files);
			} else {
				new Notice("Unable to open Cards View");
			}
		} catch (error) {
			console.error("Error opening Cards View for tag:", tagName, error);
			new Notice(`Error opening Cards View: ${this.getErrorMessage(error)}`);
		}
	}

	private async getFilesWithTag(tagName: string): Promise<TFile[]> {
		const files: TFile[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.tags?.some((tag) => tag.tag === `#${tagName}`)) {
				files.push(file);
			}
		}
		return files;
	}

	private getErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}
		return String(error);
	}
}
