import CardsViewPlugin from "./main";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";

export interface CardsViewSettings {
	minCardWidth: number;
}

export const DEFAULT_SETTINGS: CardsViewSettings = {
	minCardWidth: 200,
};

export class CardsViewSettingsTab extends PluginSettingTab {
	plugin: CardsViewPlugin;

	constructor(app: App, plugin: CardsViewPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Minimum card width")
			.setDesc("Cards will not be smaller than this width (in pixels)")
			.addText((text) =>
				text
					.setPlaceholder("200")
					.setValue(this.plugin.settings.minCardWidth.toString())
					.onChange(async (value) => {
						if (isNaN(parseInt(value))) {
							new Notice("Invalid number");
							return;
						}

						this.plugin.settings.minCardWidth = parseInt(value);
						await this.plugin.saveSettings();
					}),
			);
	}
}
