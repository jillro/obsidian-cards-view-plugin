import { Plugin, WorkspaceLeaf } from "obsidian";
import {
	CardsViewSettings,
	CardsViewSettingsTab,
	DEFAULT_SETTINGS,
} from "./settings";
import { CardsViewPluginView, VIEW_TYPE } from "./view";

export default class CardsViewPlugin extends Plugin {
	settings: CardsViewSettings;
	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CardsViewSettingsTab(this.app, this));
		this.addRibbonIcon("align-start-horizontal", "Card explorer", () => {
			this.activateView();
		});

		this.addCommand({
			id: "cards-view-plugin",
			name: "Open card explorer",
			callback: () => {
				this.activateView();
			},
		});

		this.registerView(
			VIEW_TYPE,
			(leaf) => new CardsViewPluginView(this.settings, leaf),
		);
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
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
