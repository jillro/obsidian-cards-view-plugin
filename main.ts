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
import store, { Sort } from "./components/store";

export default class CardsViewPlugin extends Plugin {
	settings: CardsViewSettings = Object.assign({}, DEFAULT_SETTINGS);

	async onload() {
		this.settings = Object.assign(this.settings, await this.loadData());
		this.addSettingTab(new CardsViewSettingsTab(this.app, this));

		store.sort.set(Sort.CreatedDesc);

		this.registerView(
			VIEW_TYPE,
			(leaf) =>
				new CardsViewPluginView(
					this.settings,
					leaf,
					this.saveSettings.bind(this),
				),
		);

		this.addRibbonIcon("align-start-horizontal", "卡片视图", () => {
			this.activateView();
		});

		this.addCommand({
			id: "cards-view-plugin",
			name: "打开卡片视图",
			callback: () => {
				this.activateView();
			},
		});

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
							.setTitle("在卡片视图中打开文件夹")
							.setIcon("documents")
							.onClick(() => this.openAllFilesInFolder(file));
					});
				}
			}),
		);

		// 标签树点击事件
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			if (this.settings.openCardsViewOnTagTreeClick) {
				const target = evt.target as HTMLElement;
				let tagElement = target.closest(".tree-item-self.tag-pane-tag");
				if (tagElement) {
					const textElement = tagElement.querySelector(".tree-item-inner-text");
					if (textElement) {
						const tagName = textElement.textContent?.trim();
						if (tagName) {
							this.openTagInCardsView(tagName);
							evt.preventDefault();
						}
					}
				}
			}
		});

		// 页面内标签点击事件
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			if (this.settings.openCardsViewOnInlineTagClick) {
				const target = evt.target as HTMLElement;
				if (
					target.classList.contains("cm-hashtag-end") &&
					target.closest(".cm-line")
				) {
					const tagName = target.textContent?.trim();
					if (tagName) {
						this.openTagInCardsView(tagName);
						evt.preventDefault();
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
			cardsView.updateFiles(files, Sort.CreatedDesc);
		}
	}

	async openTagInCardsView(tagName: string) {
		try {
			const files = await this.getFilesWithTag(tagName);
			await this.activateView();
			const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
			if (leaves.length > 0) {
				const cardsView = leaves[0].view as CardsViewPluginView;
				cardsView.updateFiles(files, Sort.CreatedDesc);
			} else {
				new Notice("无法打开卡片视图");
			}
		} catch (error) {
			console.error("打开标签卡片视图时出错:", tagName, error);
			new Notice(`打开卡片视图时出错: ${this.getErrorMessage(error)}`);
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
