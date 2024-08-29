import {
	ItemView,
	MarkdownRenderer,
	TAbstractFile,
	TFile,
	WorkspaceLeaf,
} from "obsidian";
import type { CardsViewSettings } from "./settings";
import Root from "./components/Root.svelte";
import store, { Sort } from "./components/store";
import { get } from "svelte/store";

export const VIEW_TYPE = "cards-view";

export class CardsViewPluginView extends ItemView {
	private svelteRoot: Root | null = null;

	constructor(
		public settings: CardsViewSettings,
		leaf: WorkspaceLeaf,
		private saveSettings: () => Promise<void>,
	) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE;
	}

	getDisplayText() {
		return "Cards View";
	}

	async onOpen() {
		const viewContent = this.containerEl.children[1];
		store.files.set(this.app.vault.getMarkdownFiles());

		this.svelteRoot = new Root({
			props: {
				settings: this.settings,
				openFile: async (file: TFile) =>
					await this.app.workspace.getLeaf("tab").openFile(file),
				renderFile: async (file: TFile, el: HTMLElement) => {
					const content = await this.app.vault.cachedRead(file);

					// 实现新的内容显示选项
					let displayContent: string;
					if (this.settings.contentDisplay === "all") {
						// 显示所有内容
						displayContent = content;
					} else {
						// 显示指定行数的内容
						const lines = content.split("\n");
						displayContent = lines
							.slice(0, this.settings.contentDisplay)
							.join("\n");
						if (lines.length > this.settings.contentDisplay) {
							displayContent += "\n...";
						}
					}

					// 渲染内容
					await MarkdownRenderer.render(
						this.app,
						displayContent,
						el,
						file.path,
						this,
					);
				},
				trashFile: async (file: TFile) => {
					await this.app.vault.trash(file, true);
				},
				saveSettings: this.saveSettings,
			},
			target: viewContent,
		});

		this.registerEvent(
			this.app.vault.on("create", async (file: TAbstractFile) => {
				if (file instanceof TFile && file.extension === "md") {
					store.files.update((files) => files?.concat(file));
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on("delete", async (file: TAbstractFile) => {
				if (file instanceof TFile && file.extension === "md") {
					store.files.update((files) =>
						files?.filter((f) => f.path !== file.path),
					);
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on("modify", async (file: TAbstractFile) => {
				if (file instanceof TFile && file.extension === "md") {
					store.files.update((files) =>
						files?.map((f) => (f.path === file.path ? file : f)),
					);
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on(
				"rename",
				async (file: TAbstractFile, oldPath: string) => {
					if (file instanceof TFile && file.extension === "md") {
						store.files.update((files) =>
							files?.map((f) => (f.path === oldPath ? file : f)),
						);
					}
				},
			),
		);

		viewContent.addEventListener("scroll", async () => {
			if (
				viewContent.scrollTop + viewContent.clientHeight >
				viewContent.scrollHeight - 500
			) {
				store.skipNextTransition.set(true);
				store.displayedCount.set(get(store.displayedFiles).length + 50);
			}
		});

		this.app.workspace.on("active-leaf-change", () => {
			const rootLeaf = this.app.workspace.getMostRecentLeaf(
				this.app.workspace.rootSplit,
			);
			store.viewIsVisible.set(rootLeaf?.view?.getViewType() === VIEW_TYPE);
		});
	}

	updateFiles(files: TFile[], sortType: Sort = Sort.EditedDesc) {
		store.files.set(files);
		store.displayedCount.set(50);
		store.searchQuery.set("");
		store.sort.set(sortType);
	}

	async onClose() {
		if (this.svelteRoot) {
			this.svelteRoot.$destroy();
			this.svelteRoot = null;
		}
		store.viewIsVisible.set(false);
		store.searchQuery.set("");
		store.displayedCount.set(50);
		store.sort.set(Sort.EditedDesc);
	}
}
