import CardsViewPlugin from "./main";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { Sort } from "./components/store";

export interface CardsViewSettings {
	minCardWidth: number;
	launchOnStart: boolean;
	openCardsViewOnTagTreeClick: boolean;
	openCardsViewOnInlineTagClick: boolean;
	defaultSort: Sort;
	// 新增设置项：内容显示方式
	contentDisplay: "all" | number;
}

export const DEFAULT_SETTINGS: CardsViewSettings = {
	minCardWidth: 200,
	launchOnStart: false,
	openCardsViewOnTagTreeClick: false,
	openCardsViewOnInlineTagClick: false,
	defaultSort: Sort.CreatedDesc,
	// 默认显示所有内容
	contentDisplay: "all",
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

		// 添加新的设置项：内容显示方式
		new Setting(containerEl)
			.setName("卡片是否显示全部")
			.setDesc("选择在每个卡片中显示多少内容")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("all", "显示所有内容")
					.addOption("custom", "自定义行数")
					.setValue(
						this.plugin.settings.contentDisplay === "all" ? "all" : "custom",
					)
					.onChange(async (value) => {
						if (value === "all") {
							this.plugin.settings.contentDisplay = "all";
						} else {
							// 如果选择 '自定义行数'，默认设置为10行（如果之前未设置）
							this.plugin.settings.contentDisplay =
								typeof this.plugin.settings.contentDisplay === "number"
									? this.plugin.settings.contentDisplay
									: 10;
						}
						await this.plugin.saveSettings();
						// 刷新显示以显示/隐藏行数输入框
						this.display();
					}),
			);

		// 仅当选择 '自定义行数' 时显示行数输入框
		if (typeof this.plugin.settings.contentDisplay === "number") {
			new Setting(containerEl)
				.setName("显示行数")
				.setDesc("输入要在每个卡片中显示的行数")
				.addText((text) =>
					text
						.setPlaceholder("10")
						.setValue(this.plugin.settings.contentDisplay.toString())
						.onChange(async (value) => {
							const numLines = parseInt(value);
							if (isNaN(numLines) || numLines < 1) {
								new Notice("请输入大于0的有效数字");
								return;
							}
							this.plugin.settings.contentDisplay = numLines;
							await this.plugin.saveSettings();
						}),
				);
		}

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
