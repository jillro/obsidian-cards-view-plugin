import CardsViewPlugin from "./main";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";

export interface TagSetting {
    name: string;
    color: string;
}

export interface CardsViewSettings {
	minCardWidth: number;
	textColor: string;
	tags: TagSetting[];
}

export const DEFAULT_SETTINGS: CardsViewSettings = {
	minCardWidth: 200,
	textColor: '#000',
	tags: [],
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


			containerEl.createEl('div', { text: 'Card colors', cls:'setting-item setting-item-heading' });
		
			new Setting(containerEl)
			.setName("Card text color")
			.setDesc("Define default text color for colored cards")
			.addColorPicker((text) =>
				text
					.setValue(this.plugin.settings.textColor)
					.onChange(async (value) => {
						this.plugin.settings.textColor = value;
						await this.plugin.saveSettings();
					}),
			);

			containerEl.createEl('div', { text: 'Tag colors', cls:'setting-item-name' });
			containerEl.createEl('div', { text: 'Define a card background-color for your tags', cls:'setting-item-description' });

			this.plugin.settings.tags.forEach((tag, index) => {
				const setting = new Setting(containerEl)
					.addText(text => text
						.setPlaceholder('Tag Name')
						.setValue(tag.name)
						.onChange(async (value) => {
							this.plugin.settings.tags[index].name = value;
							await this.plugin.saveSettings();
						}))
					.addColorPicker(text => text
						.setValue(tag.color)
						.onChange(async (value) => {
							this.plugin.settings.tags[index].color = value;
							await this.plugin.saveSettings();
						}))
					.addButton(button => button
						.setButtonText('Delete')
						.setCta()
						.onClick(async () => {
							this.plugin.settings.tags.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						}));
			});
	
			new Setting(containerEl)
				.addButton(button => button
					.setButtonText('Add Tag')
					.setCta()
					.onClick(async () => {
						this.plugin.settings.tags.push({ name: '', color: '' });
						await this.plugin.saveSettings();
						this.display();
					}));
	}
}
