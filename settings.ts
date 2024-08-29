import CardsViewPlugin from "./main";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { Sort } from "./components/store";

export interface CardsViewSettings {
	minCardWidth: number;
	launchOnStart: boolean;
	openCardsViewOnTagTreeClick: boolean;
	openCardsViewOnInlineTagClick: boolean;
	defaultSort: Sort;
}

export const DEFAULT_SETTINGS: CardsViewSettings = {
	minCardWidth: 200,
	launchOnStart: false,
	openCardsViewOnTagTreeClick: false,
	openCardsViewOnInlineTagClick: false,
	defaultSort: Sort.CreatedDesc,
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
			.setName("最小卡片宽度")
			.setDesc("卡片的最小宽度（像素）")
			.addText((text) =>
				text
					.setPlaceholder("200")
					.setValue(this.plugin.settings.minCardWidth.toString())
					.onChange(async (value) => {
						if (isNaN(parseInt(value))) {
							new Notice("无效的数字");
							return;
						}

						this.plugin.settings.minCardWidth = parseInt(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("启动时打开")
			.setDesc("Obsidian 启动时打开卡片视图")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.launchOnStart)
					.onChange(async (value) => {
						this.plugin.settings.launchOnStart = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("从标签树单击标签打开卡片视图")
			.setDesc("当在标签树中点击标签时打开卡片视图")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openCardsViewOnTagTreeClick)
					.onChange(async (value) => {
						this.plugin.settings.openCardsViewOnTagTreeClick = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("从页面中点击标签打开卡片视图")
			.setDesc("当在页面内容中点击标签时打开卡片视图")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openCardsViewOnInlineTagClick)
					.onChange(async (value) => {
						this.plugin.settings.openCardsViewOnInlineTagClick = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("重置设置")
			.setDesc("将所有设置重置为默认值")
			.addButton((button) =>
				button.setButtonText("重置").onClick(async () => {
					this.plugin.settings = DEFAULT_SETTINGS;
					await this.plugin.saveSettings();
					this.display();
				}),
			);
	}
}
