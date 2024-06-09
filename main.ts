import { Plugin, WorkspaceLeaf } from "obsidian";

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
}
